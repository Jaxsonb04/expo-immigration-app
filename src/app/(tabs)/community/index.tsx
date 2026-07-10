import { CommunityScreen } from '@/screens/community'
import { useIsModerator } from '@/screens/community/community.data'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

// Labeled Forum (M7-T1); the route group stays `community` so existing
// route refs and per-owner data paths are untouched.
export default function ForumTab() {
	const themeColorForeground = useThemeColor('foreground')
	const isModerator = useIsModerator()
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Fraunces_600SemiBold',
					color: themeColorForeground,
				}}
			>
				Forum
			</Stack.Title>
			<Stack.Toolbar placement="right">
				{isModerator === true ? (
					<Stack.Toolbar.Button
						icon="shield"
						accessibilityLabel="Moderation queue"
						onPress={() => router.push('/moderation')}
					/>
				) : null}
				<Stack.Toolbar.Button
					icon="plus"
					accessibilityLabel="New post"
					onPress={() => router.push('/new-post')}
				/>
			</Stack.Toolbar>

			<CommunityScreen />
		</>
	)
}
