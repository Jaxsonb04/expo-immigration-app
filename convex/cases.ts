import { literals } from 'convex-helpers/validators'
import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { type MutationCtx, mutation, query } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { getOwnedApplication } from './model/applications'
import { caseStatuses, isValidReceiptNumber, normalizeReceiptNumber } from './shared/applicationShapes'

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
 * Track a new case by its USCIS receipt number. The receipt is normalized and
 * validated (`^[A-Z]{3}\d{10}$`), unique per owner, and seeds a one-entry status
 * timeline. An optional application link must belong to the same owner.
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

		if (args.applicationId !== undefined) {
			// Ownership check; the link is one-way (a case references an application).
			await getOwnedApplication(ctx, ownerId, args.applicationId)
		}

		const now = Date.now()
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
