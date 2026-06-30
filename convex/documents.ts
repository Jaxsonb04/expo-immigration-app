import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getOwnerId, requireOwnerId } from './lib/auth'
import { documentTypeValidator } from './lib/validators'
import { loadOwnedApplicant, requireOwnedApplicant } from './model/applicants'

/** Add a document to an applicant's vault. Each add is a new version of its type. */
export const addDocument = mutation({
	args: {
		applicantId: v.id('applicants'),
		type: documentTypeValidator,
		expiryDate: v.optional(v.string()),
		storageId: v.optional(v.id('_storage')),
	},
	handler: async (ctx, args) => {
		const { ownerId } = await requireOwnedApplicant(ctx, args.applicantId)

		// Read-then-increment is safe under Convex's serializable OCC: this query
		// reads the by_applicantId_and_type index range, so a concurrent insert
		// into that same range conflicts and retries the loser, which re-reads the
		// new latest version. Versions therefore stay unique per (applicant, type).
		const latest = await ctx.db
			.query('documents')
			.withIndex('by_applicantId_and_type', (q) =>
				q.eq('applicantId', args.applicantId).eq('type', args.type),
			)
			.order('desc')
			.first()

		return await ctx.db.insert('documents', {
			applicantId: args.applicantId,
			ownerId,
			type: args.type,
			version: (latest?.version ?? 0) + 1,
			expiryDate: args.expiryDate,
			storageId: args.storageId,
		})
	},
})

/** List every document in an applicant's vault, if the caller owns the applicant. */
export const listDocuments = query({
	args: { applicantId: v.id('applicants') },
	handler: async (ctx, args) => {
		const applicant = await loadOwnedApplicant(ctx, args.applicantId)
		if (applicant === null) {
			return []
		}
		return await ctx.db
			.query('documents')
			.withIndex('by_applicantId', (q) => q.eq('applicantId', args.applicantId))
			.take(100)
	},
})

/**
 * Mint a short-lived upload URL the client POSTs a file's bytes to. Convex
 * returns a `{ storageId }` from that POST, which the client then passes to
 * `addDocument`. Gated on authentication so only signed-in callers can upload.
 */
export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await requireOwnerId(ctx)
		return await ctx.storage.generateUploadUrl()
	},
})

/**
 * A signed, time-limited URL for downloading a document's stored file. The URL
 * is unguessable but public, so issuance is gated behind ownership (ADR-0007):
 * returns null for an unauthenticated caller, a non-owner, a missing document,
 * or one with no stored file.
 */
export const getDocumentUrl = query({
	args: { documentId: v.id('documents') },
	handler: async (ctx, args) => {
		const ownerId = await getOwnerId(ctx)
		if (ownerId === null) {
			return null
		}
		const doc = await ctx.db.get(args.documentId)
		if (doc === null || doc.ownerId !== ownerId || doc.storageId === undefined) {
			return null
		}
		return await ctx.storage.getUrl(doc.storageId)
	},
})

/**
 * Delete a document the caller owns, removing its stored file first so no
 * orphaned blob is left behind. Throws 'Document not found' for a non-owner or
 * missing document (write-path behaviour, matching the other mutations).
 */
export const deleteDocument = mutation({
	args: { documentId: v.id('documents') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const doc = await ctx.db.get(args.documentId)
		if (doc === null || doc.ownerId !== ownerId) {
			throw new Error('Document not found')
		}
		if (doc.storageId !== undefined) {
			await ctx.storage.delete(doc.storageId)
		}
		await ctx.db.delete('documents', doc._id)
	},
})

/**
 * The current (latest-version) document of a given type for an applicant — what
 * the vault and reminders treat as live. Returns null if the caller does not own
 * the applicant or there is no such document.
 */
export const getCurrentDocument = query({
	args: { applicantId: v.id('applicants'), type: documentTypeValidator },
	handler: async (ctx, args) => {
		const applicant = await loadOwnedApplicant(ctx, args.applicantId)
		if (applicant === null) {
			return null
		}
		return await ctx.db
			.query('documents')
			.withIndex('by_applicantId_and_type', (q) =>
				q.eq('applicantId', args.applicantId).eq('type', args.type),
			)
			.order('desc')
			.first()
	},
})
