import { v } from 'convex/values'
import { literals } from 'convex-helpers/validators'
import { mutation, query } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { isValidIsoDate } from './shared/renewals'

// M6-T6 Upcoming renewals: one merged, bounded read for the Forms dashboard.
// Sources (MASTER_PLAN decision 6): completed in-app filings, current vault
// documents that carry an expiry date, and manual entries the person logs by
// hand (renewalEntries). Window math lives in convex/shared/renewals.ts.

const MAX_MANUAL_ENTRIES = 20

export const listRenewalItems = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)

		const [documents, entries, filed] = await Promise.all([
			ctx.db
				.query('documents')
				.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
				.take(100),
			ctx.db
				.query('renewalEntries')
				.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
				.take(MAX_MANUAL_ENTRIES),
			ctx.db
				.query('applications')
				.withIndex('by_ownerId_and_status', (q) => q.eq('ownerId', ownerId).eq('status', 'filed'))
				.take(50),
		])

		const documentItems = documents
			.filter(
				(doc) =>
					doc.supersededById === undefined &&
					doc.expiryDate !== undefined &&
					(doc.type === 'ead' || doc.type === 'permanentResidentCard'),
			)
			.map((doc) => ({
				id: doc._id as string,
				source: 'document' as const,
				kind: doc.type === 'ead' ? ('ead' as const) : ('greenCard' as const),
				expiryDate: doc.expiryDate,
				filedAt: undefined as string | undefined,
			}))

		const manualItems = entries.map((entry) => ({
			id: entry._id as string,
			source: 'manual' as const,
			kind: entry.kind,
			expiryDate: entry.expiryDate,
			filedAt: entry.filedAt,
		}))

		const filingItems = filed
			.filter((application) => application.filedAt !== undefined)
			.map((application) => ({
				id: application._id as string,
				source: 'filing' as const,
				kind: application.formType === 'i765' ? ('ead' as const) : ('greenCard' as const),
				expiryDate: undefined as string | undefined,
				filedAt: new Date(application.filedAt!).toISOString().slice(0, 10),
			}))

		return [...documentItems, ...manualItems, ...filingItems]
	},
})

export const addRenewalEntry = mutation({
	args: {
		kind: literals('ead', 'greenCard'),
		expiryDate: v.optional(v.string()),
		filedAt: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		if (args.expiryDate === undefined && args.filedAt === undefined) {
			throw new Error('Enter an expiry date or a filing date')
		}
		for (const date of [args.expiryDate, args.filedAt]) {
			if (date !== undefined && !isValidIsoDate(date)) {
				throw new Error('Enter dates as YYYY-MM-DD')
			}
		}
		const existing = await ctx.db
			.query('renewalEntries')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(MAX_MANUAL_ENTRIES)
		if (existing.length >= MAX_MANUAL_ENTRIES) {
			throw new Error('Remove an entry before adding another')
		}
		return await ctx.db.insert('renewalEntries', {
			ownerId,
			kind: args.kind,
			expiryDate: args.expiryDate,
			filedAt: args.filedAt,
			updatedAt: Date.now(),
		})
	},
})

export const deleteRenewalEntry = mutation({
	args: { entryId: v.id('renewalEntries') },
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const entry = await ctx.db.get('renewalEntries', args.entryId)
		if (entry === null || entry.ownerId !== ownerId) {
			throw new Error('Entry not found')
		}
		await ctx.db.delete('renewalEntries', args.entryId)
		return null
	},
})
