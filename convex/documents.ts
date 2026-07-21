import { literals } from 'convex-helpers/validators'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { type MutationCtx, type QueryCtx, mutation, query } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { getOwnedApplication } from './model/applications'
import { documentTypes } from './shared/applicationShapes'
import { compatibleDocumentTypes, isDocumentCompatible } from './shared/documentCompatibility'

// M2-T3 document saver. Real uploads, versioning, requirement attachment, and
// expiry metadata for the append-only Vault (schema `documents` +
// `applicationDocuments`). Every mutation is owner-scoped via requireOwnerId
// plus an explicit ownership check on every id the client hands us — ids are
// never trusted. Files themselves are written by the client straight to a
// short-lived upload URL; we only ever record the returned storageId.

const documentType = literals(...documentTypes)

async function getOwnedDocument(
	ctx: MutationCtx,
	ownerId: string,
	documentId: Id<'documents'>,
): Promise<Doc<'documents'>> {
	const doc = await ctx.db.get('documents', documentId)
	if (doc === null || doc.ownerId !== ownerId) throw new Error('Document not found')
	return doc
}

async function getOwnedSlot(
	ctx: MutationCtx,
	ownerId: string,
	slotId: Id<'applicationDocuments'>,
): Promise<Doc<'applicationDocuments'>> {
	const slot = await ctx.db.get('applicationDocuments', slotId)
	if (slot === null || slot.ownerId !== ownerId) throw new Error('Requirement not found')
	return slot
}

async function getOwnedApplicant(
	ctx: MutationCtx,
	ownerId: string,
	applicantId: Id<'applicants'>,
): Promise<Doc<'applicants'>> {
	const applicant = await ctx.db.get('applicants', applicantId)
	if (applicant === null || applicant.ownerId !== ownerId) throw new Error('Applicant not found')
	return applicant
}

function validateExpiry(expiryDate: string | undefined): void {
	if (expiryDate === undefined) return
	if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) throw new Error('Enter a valid expiry date')
}

/** Reject a syntactically-valid but non-existent storageId so the Vault never
 * records a dangling file reference. */
async function assertUploadExists(ctx: MutationCtx, storageId: Id<'_storage'>): Promise<void> {
	if ((await ctx.storage.getUrl(storageId)) === null) throw new Error('Upload not found')
}

// A single document is attached to at most one slot per application, so this is
// bounded by an owner's application count in practice; cap it to stay within the
// codebase's bounded-read discipline.
const MAX_REPOINTED_SLOTS = 200

// SECURITY — storageId trust model. Convex's upload flow returns the storageId
// only AFTER the client POSTs the file, so a blob cannot be bound to its owner
// at issue time; saveDocument/uploadNewVersion therefore accept a client-
// supplied storageId. This is safe today because storageIds are opaque and are
// NEVER returned to any other owner (getApplication.applicantDocuments omits
// storageId; getVault returns it only to the blob's own owner), so an owner
// can only obtain their own. Two guardrails apply: the id must reference a real
// blob (existence check below), and — CRITICAL for M2-T4 — any future
// view/download surface MUST serve a file only through an owner-scoped document
// row (never a raw storageId), so a document that aliased another owner's blob
// could still never be read cross-owner. If storageIds ever become exposable,
// add an issued-uploads binding before shipping a download query.

/**
 * A short-lived URL the client POSTs the file bytes to. Convex returns a
 * storageId in the upload response, which the client then passes to
 * saveDocument / uploadNewVersion. Auth-gated so only signed-in owners can
 * obtain one.
 */
export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await requireOwnerId(ctx)
		return await ctx.storage.generateUploadUrl()
	},
})

/**
 * Record an uploaded file as a Vault document for one of the owner's applicants.
 * Returns the new documentId (attach it to a requirement slot with
 * attachDocument, or leave it in the Vault for later reuse).
 */
export const saveDocument = mutation({
	args: {
		applicantId: v.id('applicants'),
		type: documentType,
		storageId: v.id('_storage'),
		label: v.optional(v.string()),
		expiryDate: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<Id<'documents'>> => {
		const ownerId = await requireOwnerId(ctx)
		await getOwnedApplicant(ctx, ownerId, args.applicantId)
		validateExpiry(args.expiryDate)
		await assertUploadExists(ctx, args.storageId)
		return await ctx.db.insert('documents', {
			ownerId,
			applicantId: args.applicantId,
			type: args.type,
			label: args.label,
			storageId: args.storageId,
			expiryDate: args.expiryDate,
			updatedAt: Date.now(),
		})
	},
})

/**
 * Attach an existing Vault document to a requirement slot. This is the reuse
 * path (ADR / decision 7): a document uploaded for an applicant can satisfy the
 * matching requirement on ANY of that applicant's applications with no
 * re-upload. Rules, enforced server-side: same applicant, a document TYPE the
 * requirement actually accepts (shared/documentCompatibility.ts — a photo can
 * never satisfy "current EAD card"), the current version (not superseded), and
 * a draft application (a filed application's checklist is part of its filing
 * record). Idempotent.
 */
export const attachDocument = mutation({
	args: { slotId: v.id('applicationDocuments'), documentId: v.id('documents') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const slot = await getOwnedSlot(ctx, ownerId, args.slotId)
		const document = await getOwnedDocument(ctx, ownerId, args.documentId)
		const application = await getOwnedApplication(ctx, ownerId, slot.applicationId)
		if (application.status !== 'draft') {
			throw new Error('Only draft applications can change their documents')
		}
		if (document.applicantId !== application.applicantId) {
			throw new Error('That document belongs to a different applicant')
		}
		if (document.supersededById !== undefined) {
			throw new Error('That document has a newer version — attach the newest one instead')
		}
		if (!isDocumentCompatible(slot.requirementKey, document.type)) {
			const accepted = compatibleDocumentTypes[slot.requirementKey]?.join(', ') ?? 'none'
			throw new Error(`That document type can't satisfy this requirement (accepts: ${accepted})`)
		}
		await ctx.db.patch('applicationDocuments', slot._id, {
			status: 'attached',
			documentId: document._id,
			updatedAt: Date.now(),
		})
	},
})

/** Return a slot to `needed`, clearing its document link. Draft-only, like
 * attach: a filed application's checklist is frozen with its filing record. */
export const detachDocument = mutation({
	args: { slotId: v.id('applicationDocuments') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const slot = await getOwnedSlot(ctx, ownerId, args.slotId)
		const application = await getOwnedApplication(ctx, ownerId, slot.applicationId)
		if (application.status !== 'draft') {
			throw new Error('Only draft applications can change their documents')
		}
		await ctx.db.patch('applicationDocuments', slot._id, {
			status: 'needed',
			documentId: undefined,
			updatedAt: Date.now(),
		})
	},
})

/**
 * Replace a document with a newer file (decision 9). Appends a new Vault row
 * linked to the old one (supersedesId / supersededById), and re-points every
 * requirement slot that used the old version to the new one so attachments
 * always follow the current document. Refuses to branch an already-superseded
 * version.
 */
export const uploadNewVersion = mutation({
	args: {
		supersedesId: v.id('documents'),
		storageId: v.id('_storage'),
		label: v.optional(v.string()),
		expiryDate: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<Id<'documents'>> => {
		const ownerId = await requireOwnerId(ctx)
		const previous = await getOwnedDocument(ctx, ownerId, args.supersedesId)
		if (previous.supersededById !== undefined) {
			throw new Error('This document already has a newer version')
		}
		validateExpiry(args.expiryDate)
		await assertUploadExists(ctx, args.storageId)
		const now = Date.now()
		const newId = await ctx.db.insert('documents', {
			ownerId,
			applicantId: previous.applicantId,
			type: previous.type,
			label: args.label ?? previous.label,
			storageId: args.storageId,
			// Carry the expiry forward by default — replacing a file (a re-scan,
			// a clearer photo) isn't a statement that the expiry changed too.
			expiryDate: args.expiryDate ?? previous.expiryDate,
			supersedesId: previous._id,
			updatedAt: now,
		})
		await ctx.db.patch('documents', previous._id, { supersededById: newId, updatedAt: now })

		const slots = await ctx.db
			.query('applicationDocuments')
			.withIndex('by_documentId', (q) => q.eq('documentId', previous._id))
			.take(MAX_REPOINTED_SLOTS)
		for (const slot of slots) {
			await ctx.db.patch('applicationDocuments', slot._id, { documentId: newId, updatedAt: now })
		}
		return newId
	},
})

async function attachedApplications(
	ctx: QueryCtx | MutationCtx,
	documentId: Id<'documents'>,
): Promise<
	{
		applicationId: Id<'applications'>
		formType: Doc<'applications'>['formType']
		applicationKind: Doc<'applications'>['applicationKind']
		requirementKey: string
	}[]
> {
	const slots = await ctx.db
		.query('applicationDocuments')
		.withIndex('by_documentId', (q) => q.eq('documentId', documentId))
		.take(MAX_REPOINTED_SLOTS)
	const resolved = await Promise.all(
		slots.map(async (slot) => {
			const application = await ctx.db.get('applications', slot.applicationId)
			if (application === null) return null
			return {
				applicationId: application._id,
				formType: application.formType,
				applicationKind: application.applicationKind,
				requirementKey: slot.requirementKey,
			}
		}),
	)
	return resolved.filter((entry) => entry !== null)
}

/**
 * Vault document management (P1): the single-document detail view a Vault
 * row opens into. Not-found and not-owned both return null rather than
 * throwing — deleteDocument's commit re-runs any still-mounted subscription
 * on this query before its screen unmounts (the applications.ts precedent),
 * so a graceful fallback is required, not a crash. `url` is a short-lived
 * signed link, resolved fresh on every read; `attachedTo` drives both the
 * "currently used by" list and the delete-lock reason.
 */
export const getDocumentDetail = query({
	args: { documentId: v.id('documents') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const doc = await ctx.db.get('documents', args.documentId)
		if (doc === null || doc.ownerId !== ownerId) return null

		const [applicant, url, attachedTo] = await Promise.all([
			ctx.db.get('applicants', doc.applicantId),
			ctx.storage.getUrl(doc.storageId),
			attachedApplications(ctx, doc._id),
		])

		return {
			_id: doc._id,
			type: doc.type,
			label: doc.label,
			expiryDate: doc.expiryDate,
			updatedAt: doc.updatedAt,
			isCurrent: doc.supersededById === undefined,
			applicantName: applicant?.displayName ?? 'Unknown',
			url,
			attachedTo,
		}
	},
})

/** Set or clear a Vault document's expiry date — the one piece of metadata
 * saveDocument/uploadNewVersion accept but no UI has ever let a user edit
 * after the fact. `expiryDate: undefined` clears it. */
export const updateDocumentExpiry = mutation({
	args: { documentId: v.id('documents'), expiryDate: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const doc = await getOwnedDocument(ctx, ownerId, args.documentId)
		validateExpiry(args.expiryDate)
		await ctx.db.patch('documents', doc._id, { expiryDate: args.expiryDate, updatedAt: Date.now() })
	},
})

/**
 * Permanently delete a Vault document and its underlying file. Refused while
 * the document is attached to any requirement slot — on ANY application,
 * regardless of status — since a slot's `documentId` is dereferenced by id
 * with no null-check on the read side; deleting an attached document would
 * silently blank that slot's shown file rather than erroring. Detach it
 * first (draft applications only — see attachDocument/detachDocument).
 * Superseded (replaced) versions are freely deletable: nothing in this
 * codebase ever dereferences `supersedesId`/`supersededById` as a document
 * lookup, only as an `isCurrent` flag.
 */
export const deleteDocument = mutation({
	args: { documentId: v.id('documents') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const doc = await getOwnedDocument(ctx, ownerId, args.documentId)
		const attachedTo = await attachedApplications(ctx, doc._id)
		if (attachedTo.length > 0) {
			throw new Error(
				'This document is attached to an application. Detach it there before deleting.',
			)
		}
		await ctx.storage.delete(doc.storageId)
		await ctx.db.delete('documents', doc._id)
	},
})
