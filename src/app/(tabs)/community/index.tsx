import { CommunityHero, TabIntro } from '@/components/core'
import { CommunityScreen } from '@/screens/community'
import { useIsModerator } from '@/screens/community/community.data'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'
import { View } from 'react-native'

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

			<View className="flex-1">
				<CommunityScreen />
				<TabIntro
					prefKey="forumIntroDismissed"
					hero={<CommunityHero width={140} />}
					title={'You’re not\nfiling alone.'}
					body="Compare notes with people on the same road — and keep up with what USCIS announces."
					features={[
						{
							icon: 'heart-handshake',
							title: 'Peer support',
							detail: 'Real experiences from other filers — never legal advice.',
						},
						{
							icon: 'venetian-mask',
							title: 'Pseudonymous by design',
							detail: 'You post under a handle; your case details stay yours.',
						},
						{
							icon: 'newspaper',
							title: 'Official USCIS news',
							detail: 'Announcements straight from uscis.gov, in one place.',
						},
					]}
				/>
			</View>
		</>
	)
}
