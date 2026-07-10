import { CommunityScreen } from '@/screens/community'
import { useIsModerator } from '@/screens/community/community.data'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

export default function CommunityTab() {
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
				Community
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
				<Stack.Toolbar.Button
					icon="person.fill"
					accessibilityLabel="Profile"
					onPress={() => router.push('/account')}
				/>
			</Stack.Toolbar>

			<CommunityScreen />
		</>
	)
}
