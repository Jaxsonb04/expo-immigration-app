import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

// M4-T2 data layer for the Community tab, wiring the M4-T1 backend
// (convex/community.ts). Reads are public (anonymous reading works); writes are
// gated in the UI by useRequireAccount and enforced server-side.

export type ForumPost = NonNullable<FunctionReturnType<typeof api.community.getPost>>
export type ForumComment = FunctionReturnType<typeof api.community.listComments>['page'][number]

const FEED_PAGE_SIZE = 20
const COMMENTS_PAGE_SIZE = 30

/** Paginated public feed (visible posts, newest activity first). */
export function usePosts() {
	return usePaginatedQuery(api.community.listPosts, {}, { initialNumItems: FEED_PAGE_SIZE })
}

export function usePost(postId: Id<'forumPosts'>) {
	return useQuery(api.community.getPost, { postId })
}

/** Paginated public comments for a post (oldest first). */
export function useComments(postId: Id<'forumPosts'>) {
	return usePaginatedQuery(
		api.community.listComments,
		{ postId },
		{ initialNumItems: COMMENTS_PAGE_SIZE },
	)
}

export function useCreatePost() {
	return useMutation(api.community.createPost)
}

export function useAddComment() {
	return useMutation(api.community.addComment)
}

export function useReportContent() {
	return useMutation(api.community.reportContent)
}

export function useDeletePost() {
	return useMutation(api.community.deletePost)
}

export function useDeleteComment() {
	return useMutation(api.community.deleteComment)
}

// --- M4-T3: per-viewer blocks ------------------------------------------------

export function useBlockAuthor() {
	return useMutation(api.community.blockAuthor)
}

export function useUnblockAuthor() {
	return useMutation(api.community.unblockAuthor)
}

/** The viewer's own block list (blocked handles + pseudonymous profile ids). */
export function useMyBlocks() {
	return useQuery(api.community.listMyBlocks)
}

// --- M4-T3: moderation (email-allowlisted moderators only) -------------------

export type ModerationReport = FunctionReturnType<
	typeof api.moderation.listReports
>['page'][number]

/** Whether the current identity is a moderator (undefined while loading;
 * false for everyone who is not on the server-side email allowlist). */
export function useIsModerator() {
	return useQuery(api.moderation.isModerator)
}

const REPORTS_PAGE_SIZE = 20

/** Paginated open-report queue. Moderator-only — pass enabled=false to skip
 * the query entirely for regular users (the server rejects them anyway). */
export function useReports(enabled: boolean) {
	return usePaginatedQuery(api.moderation.listReports, enabled ? {} : 'skip', {
		initialNumItems: REPORTS_PAGE_SIZE,
	})
}

export function useSetModerationStatus() {
	return useMutation(api.moderation.setModerationStatus)
}

export function useResolveReport() {
	return useMutation(api.moderation.resolveReport)
}

export {
	REPORT_REASON_LABELS,
	commentCountLabel,
	formatRelativeTime,
	handleInitials,
} from './community.format'
