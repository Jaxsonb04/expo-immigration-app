import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireOwnerId } from './lib/auth'

export const listApplicants = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)
		return await ctx.db
			.query('applicants')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(50)
	},
})

/**
 * Create an applicant. The self applicant is lazy and unique per owner
 * (decision 3): asking for `isSelf` when one already exists returns the
 * existing row instead of creating a duplicate, so the "Who is this for? →
 * Myself" flow is safely re-runnable.
 */
export const createApplicant = mutation({
	args: {
		displayName: v.string(),
		isSelf: v.boolean(),
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		const displayName = args.displayName.trim()
		if (displayName.length === 0) throw new Error('Name is required')

		if (args.isSelf) {
			const existing = await ctx.db
				.query('applicants')
				.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
				.take(50)
			const self = existing.find((a) => a.isSelf)
			if (self !== undefined) return self._id
		}

		return await ctx.db.insert('applicants', {
			ownerId,
			isSelf: args.isSelf,
			displayName,
			profile: {},
			updatedAt: Date.now(),
		})
	},
})
