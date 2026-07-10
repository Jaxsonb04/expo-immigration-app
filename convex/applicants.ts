import { v } from 'convex/values'
import { zodToConvex } from 'convex-helpers/server/zod4'
import { mutation, query } from './_generated/server'
import { requireOwnerId } from './lib/auth'
import { personFactsShape } from './shared/applicationShapes'

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

/** The owner's own applicant row (isSelf), or null before it lazily exists. */
export const getSelfApplicant = query({
	args: {},
	handler: async (ctx) => {
		const ownerId = await requireOwnerId(ctx)
		const rows = await ctx.db
			.query('applicants')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(50)
		return rows.find((row) => row.isSelf) ?? null
	},
})

/**
 * Save the owner's own profile from the Profile screen (M6-T5): display name
 * plus the person-facts the filings prefill from (name, date of birth, country
 * of birth, A-Number, mailing address). Creates the self applicant lazily —
 * exactly the row the interview's promotion step writes to (ADR-0014).
 *
 * The submitted facts REPLACE the edited fields: the form always submits every
 * field it owns, so an omitted optional means "cleared", not "unchanged".
 * `eligibilityCategory` is interview-owned (never edited here) and is carried
 * over from the existing profile.
 */
export const updateSelfProfile = mutation({
	args: {
		displayName: v.optional(v.string()),
		profile: zodToConvex(personFactsShape.partial()),
	},
	handler: async (ctx, args) => {
		const ownerId = await requireOwnerId(ctx)
		// Semantic validation against the single-source shape (field formats:
		// A-Number digits, ISO date of birth, address pieces).
		const parsed = personFactsShape.partial().parse(args.profile)

		const displayName = args.displayName?.trim()
		if (displayName !== undefined && displayName.length === 0) {
			throw new Error('Name is required')
		}

		const rows = await ctx.db
			.query('applicants')
			.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
			.take(50)
		const self = rows.find((row) => row.isSelf)

		if (self === undefined) {
			return await ctx.db.insert('applicants', {
				ownerId,
				isSelf: true,
				displayName: displayName ?? 'Me',
				profile: parsed,
				updatedAt: Date.now(),
			})
		}

		await ctx.db.patch('applicants', self._id, {
			...(displayName !== undefined ? { displayName } : {}),
			profile: {
				...(self.profile.eligibilityCategory !== undefined && parsed.eligibilityCategory === undefined
					? { eligibilityCategory: self.profile.eligibilityCategory }
					: {}),
				...parsed,
			},
			updatedAt: Date.now(),
		})
		return self._id
	},
})
