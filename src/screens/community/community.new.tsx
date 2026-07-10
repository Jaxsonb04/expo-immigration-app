import { useRequireAccount } from '@/components/account'
import { BodyScrollView } from '@/components/core'
import { POST_BODY_MAX, POST_TITLE_MAX } from '@convex/shared/community'
import { router } from 'expo-router'
import { Button, Input, Label, TextArea, TextField, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { useCreatePost } from './community.data'

/**
 * New-post modal (M4-T2). Posting is a gated write: an anonymous author can fill
 * the form (endowed progress, ADR-0010), and submitting first awaits the account
 * gate, then the server re-enforces credentials + validators. On success the
 * modal dismisses and the reactive feed surfaces the new post.
 */
export function NewPostScreen() {
	const requireAccount = useRequireAccount()
	const createPost = useCreatePost()
	const [title, setTitle] = useState('')
	const [body, setBody] = useState('')
	const [busy, setBusy] = useState(false)

	const canSubmit = title.trim().length > 0 && body.trim().length > 0

	async function submit() {
		if (!canSubmit) return
		const ok = await requireAccount({
			title: 'Create an account to post',
			description: 'An account lets you post and get replies from others.',
		})
		if (!ok) return
		setBusy(true)
		try {
			await createPost({ title: title.trim(), body: body.trim() })
			router.back()
		} catch (error) {
			Alert.alert('Could not post', error instanceof Error ? error.message : 'Please try again.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<BodyScrollView contentContainerClassName="gap-6 py-5">
			<View className="gap-1">
				<Typography.Paragraph color="muted">
					Ask a question or share your experience. Please don’t include personal details like your
					A-Number or address — this is a public, peer-support space, not legal advice.
				</Typography.Paragraph>
			</View>

			<TextField>
				<Label>Title</Label>
				<Input
					value={title}
					onChangeText={setTitle}
					placeholder="e.g. How long did your I-765 renewal take?"
					maxLength={POST_TITLE_MAX}
					autoCapitalize="sentences"
				/>
			</TextField>

			<TextField>
				<Label>Details</Label>
				<TextArea
					value={body}
					onChangeText={setBody}
					placeholder="Share the context or your question…"
					maxLength={POST_BODY_MAX}
				/>
			</TextField>

			<View className="gap-2">
				<Button isDisabled={busy || !canSubmit} onPress={submit}>
					<Button.Label>{busy ? 'Posting…' : 'Post to community'}</Button.Label>
				</Button>
				<Pressable
					accessibilityRole="link"
					accessibilityLabel="Read the forum rules"
					onPress={() => router.push('/community-rules')}
				>
					<Typography.Paragraph color="muted" className="text-center text-xs leading-relaxed">
						By posting you agree to the <Typography.Paragraph className="text-xs underline">forum rules</Typography.Paragraph>.
					</Typography.Paragraph>
				</Pressable>
			</View>
		</BodyScrollView>
	)
}
