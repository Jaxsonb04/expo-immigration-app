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

export {
	REPORT_REASON_LABELS,
	commentCountLabel,
	formatRelativeTime,
	handleInitials,
} from './community.format'
