import { CommunityDetailScreen } from '@/screens/community'
import type { Id } from '@convex/_generated/dataModel'
import { Stack, useLocalSearchParams } from 'expo-router'

export default function CommunityPostRoute() {
	const { postId } = useLocalSearchParams<{ postId: string }>()
	return (
		<>
			<Stack.Title>Post</Stack.Title>
			<CommunityDetailScreen postId={postId as Id<'forumPosts'>} />
		</>
	)
}
