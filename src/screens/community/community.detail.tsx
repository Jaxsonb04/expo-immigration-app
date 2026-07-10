import { useRequireAccount } from '@/components/account'
import { BodyScrollView, ScreenError, ScreenLoading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import type { Id } from '@convex/_generated/dataModel'
import { router } from 'expo-router'
import { Avatar, Button, Separator, Surface, TextArea, TextField, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { ReportAction } from './community.report'
import {
	formatRelativeTime,
	handleInitials,
	useAddComment,
	useBlockAuthor,
	useComments,
	useDeleteComment,
	useDeletePost,
	usePost,
	type ForumComment,
	type ForumPost,
} from './community.data'

function AuthorRow({ handle, at, now }: { handle: string; at: number; now: number }) {
	return (
		<View className="flex-row items-center gap-2.5">
			<Avatar size="sm" color="accent">
				<Avatar.Fallback>{handleInitials(handle)}</Avatar.Fallback>
			</Avatar>
			<Typography.Paragraph className="flex-1 font-medium">{handle}</Typography.Paragraph>
			<Typography.Paragraph color="muted" className="text-xs tabular-nums">
				{formatRelativeTime(at, now)}
			</Typography.Paragraph>
		</View>
	)
}

/** A subordinate, destructive "Delete" affordance with a confirm dialog. */
function DeleteAction({ label, onConfirm }: { label: string; onConfirm: () => Promise<unknown> }) {
	function confirm() {
		Alert.alert(`Delete this ${label}?`, 'This cannot be undone.', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Delete', style: 'destructive', onPress: () => void onConfirm() },
		])
	}
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Delete this ${label}`}
			className="flex-row items-center gap-1.5"
			onPress={confirm}
		>
			<StyledLucideIcon name="trash-2" size={13} className="text-danger" />
			<Typography.Paragraph className="text-xs font-medium text-danger">Delete</Typography.Paragraph>
		</Pressable>
	)
}

/**
 * "Block author" (M4-T3): a per-viewer filter, not moderation. Confirms, then
 * awaits the account gate (blocks belong to a recoverable account) and calls
 * the server; the reactive queries make the author's content vanish for this
 * viewer only. Unblock lives in Account.
 */
function BlockAuthorAction({ handle }: { handle: string }) {
	const requireAccount = useRequireAccount()
	const blockAuthor = useBlockAuthor()

	async function block() {
		const ok = await requireAccount({
			title: 'Create an account to block',
			description: 'An account remembers who you\u2019ve blocked across devices.',
		})
		if (!ok) return
		try {
			await blockAuthor({ handle })
		} catch (error) {
			Alert.alert('Could not block', error instanceof Error ? error.message : 'Please try again.')
		}
	}

	function confirm() {
		Alert.alert(
			`Block ${handle}?`,
			'You won\u2019t see their posts or comments anymore. You can unblock them from Account.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Block', style: 'destructive', onPress: () => void block() },
			],
		)
	}

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Block ${handle}`}
			className="flex-row items-center gap-1.5"
			onPress={confirm}
		>
			<StyledLucideIcon name="user-x" size={13} className="text-muted" />
			<Typography.Paragraph color="muted" className="text-xs font-medium">
				Block author
			</Typography.Paragraph>
		</Pressable>
	)
}

function CommentRow({ comment, now }: { comment: ForumComment; now: number }) {
	const deleteComment = useDeleteComment()
	return (
		<Surface variant="secondary" className="gap-2 rounded-2xl p-3.5">
			<AuthorRow handle={comment.authorHandle} at={comment.createdAt} now={now} />
			<Typography.Paragraph className="text-sm leading-relaxed">{comment.body}</Typography.Paragraph>
			<View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
				{comment.isMine ? (
					<DeleteAction label="comment" onConfirm={() => deleteComment({ commentId: comment._id })} />
				) : (
					<>
						<ReportAction target={{ type: 'comment', id: comment._id }} />
						<BlockAuthorAction handle={comment.authorHandle} />
					</>
				)}
			</View>
		</Surface>
	)
}

function CommentComposer({ postId }: { postId: Id<'forumPosts'> }) {
	const requireAccount = useRequireAccount()
	const addComment = useAddComment()
	const [body, setBody] = useState('')
	const [busy, setBusy] = useState(false)

	async function send() {
		const trimmed = body.trim()
		if (trimmed.length === 0) return
		const ok = await requireAccount({
			title: 'Create an account to comment',
			description: 'Join the conversation with an account that keeps your work safe.',
		})
		if (!ok) return
		setBusy(true)
		try {
			await addComment({ postId, body: trimmed })
			setBody('')
		} catch (error) {
			Alert.alert('Could not comment', error instanceof Error ? error.message : 'Please try again.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<View className="gap-2">
			<TextField>
				<TextArea
					value={body}
					onChangeText={setBody}
					placeholder="Add a comment…"
					variant="secondary"
				/>
			</TextField>
			<Button isDisabled={busy || body.trim().length === 0} onPress={send}>
				<Button.Label>{busy ? 'Posting…' : 'Post comment'}</Button.Label>
			</Button>
		</View>
	)
}

function PostCard({ post, now }: { post: ForumPost; now: number }) {
	const deletePost = useDeletePost()

	async function remove() {
		try {
			await deletePost({ postId: post._id })
			router.back()
		} catch (error) {
			Alert.alert('Could not delete', error instanceof Error ? error.message : 'Please try again.')
		}
	}

	return (
		<View className="gap-3">
			<AuthorRow handle={post.authorHandle} at={post.createdAt} now={now} />
			<Typography.Heading className="text-xl font-bold leading-snug">{post.title}</Typography.Heading>
			<Typography.Paragraph className="leading-relaxed">{post.body}</Typography.Paragraph>
			<View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
				{post.isMine ? (
					<DeleteAction label="post" onConfirm={remove} />
				) : (
					<>
						<ReportAction target={{ type: 'post', id: post._id }} />
						<BlockAuthorAction handle={post.authorHandle} />
					</>
				)}
			</View>
		</View>
	)
}

/**
 * Post detail (M4-T2): the full post, its comments, and a gated composer.
 * Reading is public; commenting and reporting await the account gate. A deleted
 * or moderator-hidden post reads as not found (the server returns null).
 */
export function CommunityDetailScreen({ postId }: { postId: Id<'forumPosts'> }) {
	const post = usePost(postId)
	const { results: comments, status, loadMore } = useComments(postId)
	const [now] = useState(() => Date.now())

	if (post === undefined) return <ScreenLoading />
	if (post === null) return <ScreenError title="This post is no longer available" />

	return (
		<BodyScrollView contentContainerClassName="gap-5 py-4">
			<PostCard post={post} now={now} />

			<View className="flex-row items-center justify-center gap-1.5">
				<StyledLucideIcon name="info" size={12} className="text-muted" />
				<Typography.Paragraph color="muted" className="text-xs leading-relaxed">
					Peer experiences from other applicants — not legal advice.
				</Typography.Paragraph>
			</View>

			<Separator />

			<View className="gap-3">
				<Typography.Heading className="text-base font-semibold">Comments</Typography.Heading>
				{status === 'LoadingFirstPage' ? (
					<Typography.Paragraph color="muted" className="text-sm">
						Loading comments…
					</Typography.Paragraph>
				) : comments.length === 0 ? (
					<Typography.Paragraph color="muted" className="text-sm">
						No comments yet — be the first to reply.
					</Typography.Paragraph>
				) : (
					<View className="gap-2.5">
						{comments.map((comment) => (
							<CommentRow key={comment._id} comment={comment} now={now} />
						))}
						{status === 'CanLoadMore' || status === 'LoadingMore' ? (
							<Button
								variant="ghost"
								isDisabled={status === 'LoadingMore'}
								onPress={() => loadMore(30)}
							>
								<Button.Label>{status === 'LoadingMore' ? 'Loading…' : 'Load more'}</Button.Label>
							</Button>
						) : null}
					</View>
				)}
			</View>

			<Separator />
			<CommentComposer postId={postId} />
			<Typography.Paragraph color="muted" className="text-center text-xs leading-relaxed">
				Be respectful. This is peer support, not legal advice.
			</Typography.Paragraph>
		</BodyScrollView>
	)
}
