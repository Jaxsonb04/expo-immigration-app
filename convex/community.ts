import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { literals } from 'convex-helpers/validators'
import type { Doc, Id } from './_generated/dataModel'
import { type MutationCtx, type QueryCtx, mutation, query } from './_generated/server'
import { getAccountIdentity, getOwnerId, requireCredentialedOwnerId } from './lib/auth'
import {
	COMMENT_BODY_MAX,
	POST_BODY_MAX,
	POST_TITLE_MAX,
	REPORT_NOTE_MAX,
	clampPageSize,
	generateHandle,
	isValidHandle,
	normalizeHandle,
	optionalText,
	reportReasons,
	reportTargetTypes,
	requireText,
	targetKeyFor,
} from './shared/community'

// M4-T1 community forum backend (ADR-0003 amended scope). Pseudonymous:
// authorship is stored as a private ownerId for authorization + moderation, but
// public reads return ONLY a denormalized handle. The two invariants that make
// this safe:
//   1. Public reads NEVER expose ownerId. Every public payload is built
//      field-by-field by an allowlist constructor (toPublicPost/toPublicComment)
//      — raw docs are never spread — so a private field can never leak by
//      omission, and reportCount / moderation internals stay server-side.
//   2. Public reads are BOUNDED. Every list clamps the requested page size and
//      only returns `visible` content under a `visible` parent.
// Writes require a credentialed (non-anonymous) owner: the forum is a public
// write surface, so the ADR-0010 client account gate is duplicated server-side.

// ---------------------------------------------------------------------------
// Public projections — the sanitization boundary.
// ---------------------------------------------------------------------------

// Allowlisted public post: no authorOwnerId, no reportCount, no moderation
// internals. `isMine` lets the viewer's own content be styled without exposing
// any other author's identity.
const publicPostValidator = v.object({
	_id: v.id('forumPosts'),
	authorHandle: v.string(),
	title: v.string(),
	body: v.string(),
	commentCount: v.number(),
	lastActivityAt: v.number(),
	createdAt: v.number(),
	isMine: v.boolean(),
})

const publicCommentValidator = v.object({
	_id: v.id('forumComments'),
	authorHandle: v.string(),
	body: v.string(),
	createdAt: v.number(),
	isMine: v.boolean(),
})

type PublicPost = typeof publicPostValidator.type
type PublicComment = typeof publicCommentValidator.type

// Build the public shape field-by-field. `isMine` is a pure in-memory string
// compare against the row's authorOwnerId — NO per-row DB read — so a large page
// never fans out into N profile lookups.
function toPublicPost(post: Doc<'forumPosts'>, callerOwnerId: string | null): PublicPost {
	return {
		_id: post._id,
		authorHandle: post.authorHandle,
		title: post.title,
		body: post.body,
		commentCount: post.commentCount,
		lastActivityAt: post.lastActivityAt,
		createdAt: post.createdAt,
		isMine: callerOwnerId !== null && post.authorOwnerId === callerOwnerId,
	}
}

function toPublicComment(comment: Doc<'forumComments'>, callerOwnerId: string | null): PublicComment {
	return {
		_id: comment._id,
		authorHandle: comment.authorHandle,
		body: comment.body,
		createdAt: comment.createdAt,
		isMine: callerOwnerId !== null && comment.authorOwnerId === callerOwnerId,
	}
}

const paginatedValidator = <T extends Parameters<typeof v.array>[0]>(item: T) =>
	v.object({
		page: v.array(item),
		isDone: v.boolean(),
		continueCursor: v.string(),
		splitCursor: v.optional(v.union(v.string(), v.null())),
		pageStatus: v.optional(
			v.union(v.literal('SplitRecommended'), v.literal('SplitRequired'), v.null()),
		),
	})

// ---------------------------------------------------------------------------
// Profiles.
// ---------------------------------------------------------------------------

const MAX_HANDLE_ATTEMPTS = 8

async function findProfile(
	ctx: QueryCtx | MutationCtx,
	ownerId: string,
): Promise<Doc<'communityProfiles'> | null> {
	// .first() (not .unique()) so a rare double-insert race can never make reads
	// throw; the first profile wins.
	return await ctx.db
		.query('communityProfiles')
		.withIndex('by_ownerId', (q) => q.eq('ownerId', ownerId))
		.first()
}

async function isHandleTaken(ctx: MutationCtx, handle: string): Promise<boolean> {
	const existing = await ctx.db
		.query('communityProfiles')
		.withIndex('by_handle', (q) => q.eq('handle', handle))
		.first()
	return existing !== null
}

/**
 * Create the owner's profile with a unique handle. If a handle is supplied it is
 * validated and must be free; otherwise a friendly pseudonym is generated,
 * retrying on collision. NOTE: handle uniqueness is a read-then-insert with no
 * DB constraint, so two owners could in theory take the same handle in the same
 * millisecond — accepted for v1 (a shared pseudonym is not a security issue).
 */
async function createProfile(
	ctx: MutationCtx,
	ownerId: string,
	requestedHandle: string | undefined,
): Promise<Doc<'communityProfiles'>> {
	const now = Date.now()
	let handle: string
	if (requestedHandle !== undefined) {
		handle = normalizeHandle(requestedHandle)
		if (!isValidHandle(handle)) {
			throw new Error('Choose a handle of 3–20 letters, numbers, or underscores')
		}
		if (await isHandleTaken(ctx, handle)) throw new Error('That handle is already taken')
	} else {
		handle = generateHandle(now, 0)
		let attempt = 1
		while ((await isHandleTaken(ctx, handle)) && attempt < MAX_HANDLE_ATTEMPTS) {
			handle = generateHandle(now, attempt)
			attempt += 1
		}
		if (await isHandleTaken(ctx, handle)) {
			throw new Error('Could not pick a unique handle — please try again')
		}
	}
	const id = await ctx.db.insert('communityProfiles', { ownerId, handle, createdAt: now })
	const profile = await ctx.db.get('communityProfiles', id)
	// Non-null: we just inserted it.
	return profile!
}

/** Get the owner's profile, creating it on first use. Used by the write paths. */
async function ensureProfileForOwner(
	ctx: MutationCtx,
	ownerId: string,
): Promise<Doc<'communityProfiles'>> {
	return (await findProfile(ctx, ownerId)) ?? (await createProfile(ctx, ownerId, undefined))
}

/**
 * Ensure the caller has a community profile. Idempotent: if one already exists
 * it is returned unchanged — a differing `handle` argument is IGNORED (handles
 * are immutable in v1, so denormalized authorHandles never drift). If a handle
 * is supplied for a brand-new profile it is validated and must be unique.
 */
export const ensureProfile = mutation({
	args: { handle: v.optional(v.string()) },
	handler: async (ctx, args): Promise<Id<'communityProfiles'>> => {
		const ownerId = await requireCredentialedOwnerId(ctx)
		const existing = await findProfile(ctx, ownerId)
		if (existing !== null) return existing._id
		const created = await createProfile(ctx, ownerId, args.handle)
		return created._id
	},
})

/** The caller's own profile (or null). Requires identity but not credentials —
 * an anonymous caller simply has no profile. Never returns another owner's. */
export const getMyProfile = query({
	args: {},
	returns: v.union(
		v.null(),
		v.object({ _id: v.id('communityProfiles'), handle: v.string(), createdAt: v.number() }),
	),
	handler: async (ctx) => {
		const ownerId = await getOwnerId(ctx)
		if (ownerId === null) return null
		const profile = await findProfile(ctx, ownerId)
		if (profile === null) return null
		return { _id: profile._id, handle: profile.handle, createdAt: profile.createdAt }
	},
})

// ---------------------------------------------------------------------------
// Posts & comments — writes.
// ---------------------------------------------------------------------------

export const createPost = mutation({
	args: { title: v.string(), body: v.string() },
	handler: async (ctx, args): Promise<Id<'forumPosts'>> => {
		const ownerId = await requireCredentialedOwnerId(ctx)
		const title = requireText(args.title, POST_TITLE_MAX, 'Title')
		const body = requireText(args.body, POST_BODY_MAX, 'Post')
		const profile = await ensureProfileForOwner(ctx, ownerId)
		const now = Date.now()
		return await ctx.db.insert('forumPosts', {
			authorOwnerId: ownerId,
			authorHandle: profile.handle,
			title,
			body,
			moderationStatus: 'visible',
			commentCount: 0,
			reportCount: 0,
			lastActivityAt: now,
			createdAt: now,
			updatedAt: now,
		})
	},
})

export const addComment = mutation({
	args: { postId: v.id('forumPosts'), body: v.string() },
	handler: async (ctx, args): Promise<Id<'forumComments'>> => {
		const ownerId = await requireCredentialedOwnerId(ctx)
		const body = requireText(args.body, COMMENT_BODY_MAX, 'Comment')
		const post = await ctx.db.get('forumPosts', args.postId)
		if (post === null || post.moderationStatus !== 'visible') throw new Error('Post not found')
		const profile = await ensureProfileForOwner(ctx, ownerId)
		const now = Date.now()
		const commentId = await ctx.db.insert('forumComments', {
			postId: post._id,
			authorOwnerId: ownerId,
			authorHandle: profile.handle,
			body,
			moderationStatus: 'visible',
			reportCount: 0,
			createdAt: now,
			updatedAt: now,
		})
		// Patching the shared post row also serializes concurrent comments (OCC
		// conflict on this row), so commentCount stays exact under contention.
		await ctx.db.patch('forumPosts', post._id, {
			commentCount: post.commentCount + 1,
			lastActivityAt: now,
			updatedAt: now,
		})
		return commentId
	},
})

/** Author-only soft delete (tombstone). Idempotent. */
export const deletePost = mutation({
	args: { postId: v.id('forumPosts') },
	handler: async (ctx, args): Promise<null> => {
		const ownerId = await requireCredentialedOwnerId(ctx)
		const post = await ctx.db.get('forumPosts', args.postId)
		// Not-found and not-owned collapse to one error (never leak existence).
		if (post === null || post.authorOwnerId !== ownerId) throw new Error('Post not found')
		if (post.moderationStatus === 'removed') return null
		await ctx.db.patch('forumPosts', post._id, { moderationStatus: 'removed', updatedAt: Date.now() })
		return null
	},
})

/**
 * Author-only soft delete (tombstone) of a comment. The parent post's
 * commentCount decrement is IDEMPOTENT: it fires only when this transition is
 * the one that takes the comment out of `visible`, with a floor of 0, so a
 * double-tap / concurrent double-delete can never drive the count negative.
 */
export const deleteComment = mutation({
	args: { commentId: v.id('forumComments') },
	handler: async (ctx, args): Promise<null> => {
		const ownerId = await requireCredentialedOwnerId(ctx)
		const comment = await ctx.db.get('forumComments', args.commentId)
		if (comment === null || comment.authorOwnerId !== ownerId) throw new Error('Comment not found')
		if (comment.moderationStatus === 'removed') return null
		const wasVisible = comment.moderationStatus === 'visible'
		const now = Date.now()
		await ctx.db.patch('forumComments', comment._id, { moderationStatus: 'removed', updatedAt: now })
		if (wasVisible) {
			const post = await ctx.db.get('forumPosts', comment.postId)
			// A `removed` post's count is meaningless; a `hidden` post (M4-T3) still
			// tracks its visible comments, so decrement for anything not removed.
			if (post !== null && post.moderationStatus !== 'removed') {
				await ctx.db.patch('forumPosts', post._id, {
					commentCount: Math.max(0, post.commentCount - 1),
					updatedAt: now,
				})
			}
		}
		return null
	},
})

// ---------------------------------------------------------------------------
// Reports.
// ---------------------------------------------------------------------------

type ReportTarget = Doc<'forumPosts'> | Doc<'forumComments'>

async function loadVisibleTarget(
	ctx: MutationCtx,
	targetType: 'post' | 'comment',
	targetId: string,
): Promise<ReportTarget | null> {
	try {
		const doc =
			targetType === 'post'
				? await ctx.db.get('forumPosts', targetId as Id<'forumPosts'>)
				: await ctx.db.get('forumComments', targetId as Id<'forumComments'>)
		if (doc === null || doc.moderationStatus !== 'visible') return null
		return doc
	} catch {
		// Malformed id or an id for the wrong table — treat as not found.
		return null
	}
}

/**
 * Report a post or comment. At most one report per (reporter, target): the
 * dedupe read and the target's reportCount increment are BOTH derived after
 * loading the shared target row, so two concurrent identical reports conflict on
 * that row and the OCC re-run of the loser sees the first report and
 * short-circuits — exactly one report, reportCount += 1.
 */
export const reportContent = mutation({
	args: {
		targetType: literals(...reportTargetTypes),
		targetId: v.string(),
		reason: literals(...reportReasons),
		note: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<Id<'forumReports'>> => {
		const reporterOwnerId = await requireCredentialedOwnerId(ctx)
		const note = optionalText(args.note, REPORT_NOTE_MAX, 'Note')

		const target = await loadVisibleTarget(ctx, args.targetType, args.targetId)
		if (target === null) throw new Error('Content not found')
		if (target.authorOwnerId === reporterOwnerId) throw new Error('You can’t report your own content')

		const targetKey = targetKeyFor(args.targetType, args.targetId)
		const existing = await ctx.db
			.query('forumReports')
			.withIndex('by_reporter_and_targetKey', (q) =>
				q.eq('reporterOwnerId', reporterOwnerId).eq('targetKey', targetKey),
			)
			.first()
		if (existing !== null) return existing._id

		const now = Date.now()
		const reportId = await ctx.db.insert('forumReports', {
			reporterOwnerId,
			targetType: args.targetType,
			targetKey,
			reason: args.reason,
			note,
			status: 'open',
			createdAt: now,
		})
		if (args.targetType === 'post') {
			await ctx.db.patch('forumPosts', target._id as Id<'forumPosts'>, {
				reportCount: target.reportCount + 1,
				updatedAt: now,
			})
		} else {
			await ctx.db.patch('forumComments', target._id as Id<'forumComments'>, {
				reportCount: target.reportCount + 1,
				updatedAt: now,
			})
		}
		return reportId
	},
})

// ---------------------------------------------------------------------------
// Public reads — bounded, sanitized, no auth required.
// ---------------------------------------------------------------------------

export const listPosts = query({
	args: { paginationOpts: paginationOptsValidator },
	returns: paginatedValidator(publicPostValidator),
	handler: async (ctx, args) => {
		const account = await getAccountIdentity(ctx) // best-effort; null when unauth
		const callerOwnerId = account?.ownerId ?? null
		const opts = { ...args.paginationOpts, numItems: clampPageSize(args.paginationOpts.numItems) }
		const result = await ctx.db
			.query('forumPosts')
			.withIndex('by_moderationStatus_and_lastActivityAt', (q) => q.eq('moderationStatus', 'visible'))
			.order('desc')
			.paginate(opts)
		return { ...result, page: result.page.map((p) => toPublicPost(p, callerOwnerId)) }
	},
})

export const getPost = query({
	args: { postId: v.id('forumPosts') },
	returns: v.union(v.null(), publicPostValidator),
	handler: async (ctx, args) => {
		const account = await getAccountIdentity(ctx)
		const post = await ctx.db.get('forumPosts', args.postId)
		if (post === null || post.moderationStatus !== 'visible') return null
		return toPublicPost(post, account?.ownerId ?? null)
	},
})

export const listComments = query({
	args: { postId: v.id('forumPosts'), paginationOpts: paginationOptsValidator },
	returns: paginatedValidator(publicCommentValidator),
	handler: async (ctx, args) => {
		const account = await getAccountIdentity(ctx)
		const callerOwnerId = account?.ownerId ?? null
		const opts = { ...args.paginationOpts, numItems: clampPageSize(args.paginationOpts.numItems) }
		const post = await ctx.db.get('forumPosts', args.postId)
		// A comment is only publicly listable under a live, visible parent — this
		// makes a hidden/removed post's comments unreachable AND makes comments
		// orphaned by an author's account deletion unreachable (their post is gone).
		if (post === null || post.moderationStatus !== 'visible') {
			return { page: [], isDone: true, continueCursor: '' }
		}
		const result = await ctx.db
			.query('forumComments')
			.withIndex('by_postId_and_moderationStatus_and_createdAt', (q) =>
				q.eq('postId', post._id).eq('moderationStatus', 'visible'),
			)
			.order('asc')
			.paginate(opts)
		return { ...result, page: result.page.map((c) => toPublicComment(c, callerOwnerId)) }
	},
})
