import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { literals } from 'convex-helpers/validators'
import type { Doc, Id } from './_generated/dataModel'
import { type MutationCtx, type QueryCtx, mutation, query } from './_generated/server'
import {
	paginatedValidator,
	publicCommentValidator,
	publicPostValidator,
	toPublicComment,
	toPublicPost,
} from './community'
import { isModeratorIdentity, requireModerator } from './lib/moderation'
import {
	clampPageSize,
	moderationStatuses,
	reportReasons,
	reportResolutions,
	reportTargetTypes,
	targetIdFromKey,
} from './shared/community'

// M4-T3 moderation API. Every read/write here is moderator-only (an email
// allowlist in the MODERATOR_EMAILS deployment env var — convex/lib/
// moderation.ts) EXCEPT `isModerator`, which is a safe boolean for UI gating.
//
// Privacy invariant (same as the public forum, re-stated because moderators
// are still third parties): NO payload returned here ever contains an
// ownerId, authorOwnerId, reporterOwnerId, or email. Report targets are
// projected through the SAME toPublicPost/toPublicComment allowlists the
// public feed uses, plus the target's current moderationStatus (which a
// moderator needs to act). Reporters stay anonymous even to moderators.

/** Whether the current caller may moderate. NEVER throws — unauthenticated,
 * anonymous, and unlisted callers are simply `false`. */
export const isModerator = query({
	args: {},
	returns: v.boolean(),
	handler: async (ctx) => await isModeratorIdentity(ctx),
})

// One open report, queue-shaped: the report's own public facts + the target
// content in its PUBLIC projection (or null when the target has since been
// deleted, e.g. by the author's account-erasure cascade).
const reportItemValidator = v.object({
	_id: v.id('forumReports'),
	reason: literals(...reportReasons),
	note: v.optional(v.string()),
	createdAt: v.number(),
	targetType: literals(...reportTargetTypes),
	targetKey: v.string(),
	target: v.union(
		v.null(),
		v.object({
			kind: v.literal('post'),
			post: publicPostValidator,
			moderationStatus: literals(...moderationStatuses),
		}),
		v.object({
			kind: v.literal('comment'),
			comment: publicCommentValidator,
			moderationStatus: literals(...moderationStatuses),
		}),
	),
})

type ReportItem = typeof reportItemValidator.type

async function loadReportTarget(
	ctx: QueryCtx,
	report: Doc<'forumReports'>,
): Promise<ReportItem['target']> {
	const rawId = targetIdFromKey(report.targetType, report.targetKey)
	if (rawId === null) return null
	try {
		if (report.targetType === 'post') {
			const post = await ctx.db.get('forumPosts', rawId as Id<'forumPosts'>)
			if (post === null) return null
			// toPublicPost with a null caller: the moderator is never "the author"
			// here, and the projection stays byte-identical to the public feed's.
			return { kind: 'post', post: toPublicPost(post, null), moderationStatus: post.moderationStatus }
		}
		const comment = await ctx.db.get('forumComments', rawId as Id<'forumComments'>)
		if (comment === null) return null
		return {
			kind: 'comment',
			comment: toPublicComment(comment, null),
			moderationStatus: comment.moderationStatus,
		}
	} catch {
		// Malformed / wrong-table id: treat as a vanished target.
		return null
	}
}

/** Open reports, newest first, page-clamped like every public list. Each item
 * carries the target's public shape + current moderationStatus so the queue
 * can offer Hide/Restore without another round-trip. Moderator-only. */
export const listReports = query({
	args: { paginationOpts: paginationOptsValidator },
	returns: paginatedValidator(reportItemValidator),
	handler: async (ctx, args) => {
		await requireModerator(ctx)
		const opts = { ...args.paginationOpts, numItems: clampPageSize(args.paginationOpts.numItems) }
		const result = await ctx.db
			.query('forumReports')
			.withIndex('by_status_and_createdAt', (q) => q.eq('status', 'open'))
			.order('desc')
			.paginate(opts)
		const page: ReportItem[] = []
		for (const report of result.page) {
			page.push({
				_id: report._id,
				reason: report.reason,
				note: report.note,
				createdAt: report.createdAt,
				targetType: report.targetType,
				targetKey: report.targetKey,
				target: await loadReportTarget(ctx, report),
			})
		}
		return { ...result, page }
	},
})

async function loadModerationTarget(
	ctx: MutationCtx,
	targetType: 'post' | 'comment',
	targetKey: string,
): Promise<Doc<'forumPosts'> | Doc<'forumComments'> | null> {
	const rawId = targetIdFromKey(targetType, targetKey)
	if (rawId === null) return null
	try {
		return targetType === 'post'
			? await ctx.db.get('forumPosts', rawId as Id<'forumPosts'>)
			: await ctx.db.get('forumComments', rawId as Id<'forumComments'>)
	} catch {
		return null
	}
}

/**
 * Moderator hide/restore. Only the visible<->hidden transition is allowed:
 * `removed` is an author tombstone and stays removed forever (a moderator can
 * neither resurrect nor "re-hide" it). Idempotent when already in the target
 * state. Hiding/restoring a COMMENT keeps the parent post's commentCount
 * tracking VISIBLE comments exactly, mirroring deleteComment's idempotent
 * transition-gated adjustment (floored at 0, skipped for removed parents).
 */
export const setModerationStatus = mutation({
	args: {
		targetType: literals(...reportTargetTypes),
		targetKey: v.string(),
		status: literals('hidden', 'visible'),
	},
	handler: async (ctx, args): Promise<null> => {
		await requireModerator(ctx)
		const target = await loadModerationTarget(ctx, args.targetType, args.targetKey)
		if (target === null) throw new Error('Content not found')
		if (target.moderationStatus === 'removed') {
			throw new Error('This content was deleted by its author and can’t be moderated')
		}
		if (target.moderationStatus === args.status) return null // idempotent
		const now = Date.now()
		if (args.targetType === 'post') {
			await ctx.db.patch('forumPosts', target._id as Id<'forumPosts'>, {
				moderationStatus: args.status,
				updatedAt: now,
			})
			return null
		}
		const comment = target as Doc<'forumComments'>
		await ctx.db.patch('forumComments', comment._id, {
			moderationStatus: args.status,
			updatedAt: now,
		})
		// Exactly one of these transitions happened (states differ and neither is
		// `removed`): visible->hidden decrements, hidden->visible increments.
		const post = await ctx.db.get('forumPosts', comment.postId)
		if (post !== null && post.moderationStatus !== 'removed') {
			const delta = args.status === 'hidden' ? -1 : 1
			await ctx.db.patch('forumPosts', post._id, {
				commentCount: Math.max(0, post.commentCount + delta),
				updatedAt: now,
			})
		}
		return null
	},
})

/** Close an open report as `resolved` (action taken) or `dismissed` (nothing
 * wrong). Closed reports leave the queue; there is no re-open in v1. */
export const resolveReport = mutation({
	args: { reportId: v.id('forumReports'), resolution: literals(...reportResolutions) },
	handler: async (ctx, args): Promise<null> => {
		await requireModerator(ctx)
		const report = await ctx.db.get('forumReports', args.reportId)
		if (report === null) throw new Error('Report not found')
		if (report.status !== 'open') return null // already closed — idempotent
		await ctx.db.patch('forumReports', report._id, { status: args.resolution })
		return null
	},
})
