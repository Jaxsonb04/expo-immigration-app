import { literals } from 'convex-helpers/validators'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { type MutationCtx, mutation, query } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { getOwnedApplication } from './model/applications'
import {
	caseStatuses,
	isValidReceiptNumber,
	normalizeReceiptNumber,
} from './shared/applicationShapes'

// M3-T1 case tracking (ADR-0008). Manual, owner-scoped receipt-number tracking
// with a status timeline; v1 does NOT scrape USCIS. Every mutation is
// owner-scoped via requireOwnerId and re-checks ownership on every id.

const caseStatus = literals(...caseStatuses)

async function getOwnedCase(
	ctx: MutationCtx,
	ownerId: string,
	caseId: Id<'cases'>,
): Promise<Doc<'cases'>> {
	const found = await ctx.db.get('cases', caseId)
	if (found === null || found.ownerId !== ownerId) throw new Error('Case not found')
	return found
}

export const listCases = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)
		return await ctx.db
			.query('cases')
			.withIndex('by_ownerId_and_receiptNumber', (q) => q.eq('ownerId', ownerId))
			.take(100)
	},
})

export const getCase = query({
	args: { caseId: v.id('cases') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const found = await ctx.db.get('cases', args.caseId)
		if (found === null || found.ownerId !== ownerId) throw new Error('Case not found')
		return found
	},
})

/**
 * Applications a new case can link to: the owner's non-closed applications
 * that don't already have a case (one case per application — getApplication
 * resolves the link with `.first()`). Filed first, then drafts, newest first.
 * Linking a draft marks it filed (see createCase), so drafts are offered too.
 */
export const listLinkableApplications = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)
		const [drafts, filed] = await Promise.all([
			ctx.db
				.query('applications')
				.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'draft'))
				.take(100),
			ctx.db
				.query('applications')
				.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'filed'))
				.take(100),
		])
		const linkable = []
		for (const application of [...filed, ...drafts]) {
			const linkedCase = await ctx.db
				.query('cases')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
				.first()
			if (linkedCase !== null) continue
			const applicant = await ctx.db.get('applicants', application.applicantId)
			linkable.push({
				_id: application._id,
				formType: application.formType,
				applicationKind: application.applicationKind,
				status: application.status,
				updatedAt: application.updatedAt,
				applicantName: applicant?.displayName ?? 'Unknown',
			})
		}
		return linkable.sort((a, b) => {
			if (a.status !== b.status) return a.status === 'filed' ? -1 : 1
			return b.updatedAt - a.updatedAt
		})
	},
})

/**
 * Track a new case by its USCIS receipt number. The receipt is normalized and
 * validated (`^[A-Z]{3}\d{10}$`), unique per owner, and seeds a one-entry status
 * timeline. An optional application link must belong to the same owner.
 *
 * Case-link assisted filing (decision 6): a real receipt number is decisive
 * evidence the application was filed, so linking a draft transitions it to
 * `filed` — idempotently: an already-filed application and its original
 * filedAt are left untouched.
 */
export const createCase = mutation({
	args: {
		receiptNumber: v.string(),
		applicationId: v.optional(v.id('applications')),
		status: v.optional(caseStatus),
		note: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<Id<'cases'>> => {
		const ownerId = await requireOwnerId(ctx)
		const receiptNumber = normalizeReceiptNumber(args.receiptNumber)
		if (!isValidReceiptNumber(receiptNumber)) {
			throw new Error('Enter a receipt number like EAC1234567890 (3 letters + 10 digits)')
		}

		const existing = await ctx.db
			.query('cases')
			.withIndex('by_ownerId_and_receiptNumber', (q) =>
				q.eq('ownerId', ownerId).eq('receiptNumber', receiptNumber),
			)
			.first()
		if (existing !== null) throw new Error('You’re already tracking that receipt number')

		const now = Date.now()
		if (args.applicationId !== undefined) {
			// Ownership check; the link is one-way (a case references an application).
			const application = await getOwnedApplication(ctx, ownerId, args.applicationId)
			if (application.status === 'closed') {
				throw new Error('That application is closed — reopen it before linking a case to it')
			}
			const alreadyLinked = await ctx.db
				.query('cases')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', application._id))
				.first()
			if (alreadyLinked !== null) {
				throw new Error('That application is already linked to another case')
			}
			// Receipt-number reconcile: the receipt proves the filing happened.
			if (application.status === 'draft') {
				await ctx.db.patch('applications', application._id, {
					status: 'filed',
					filedAt: application.filedAt ?? now,
					updatedAt: now,
				})
			}
		}

		const status = args.status ?? 'caseReceived'
		return await ctx.db.insert('cases', {
			ownerId,
			receiptNumber,
			applicationId: args.applicationId,
			status,
			statusHistory: [{ status, occurredAt: now, note: args.note?.trim() || undefined }],
			updatedAt: now,
		})
	},
})

/**
 * Append a manual status update to a case's timeline and advance its current
 * status. `occurredAt` lets the owner backdate an update they're recording after
 * the fact; it defaults to now.
 */
export const addStatusUpdate = mutation({
	args: {
		caseId: v.id('cases'),
		status: caseStatus,
		occurredAt: v.optional(v.number()),
		note: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const found = await getOwnedCase(ctx, ownerId, args.caseId)
		const now = Date.now()
		const entry = {
			status: args.status,
			occurredAt: args.occurredAt ?? now,
			note: args.note?.trim() || undefined,
		}
		await ctx.db.patch('cases', found._id, {
			status: args.status,
			statusHistory: [...found.statusHistory, entry],
			updatedAt: now,
		})
	},
})
