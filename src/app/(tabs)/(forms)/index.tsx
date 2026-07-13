import { FilingStackHero, TabIntro } from '@/components/core'
import { HomeScreen } from '@/screens/home'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'
import { View } from 'react-native'

// The Forms tab is the applications surface and the app's default tab — its
// route group `(forms)` holds the index route `/` (MASTER_PLAN Layout, M6-T1).
// It renders the one-screen hub (`HomeScreen`, M7-T4); the Document Vault
// lives one level deeper at `/documents`, reachable from the header action
// below and from attention items on the hub.
export default function FormsTab() {
	const themeColorForeground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Fraunces_600SemiBold',
					color: themeColorForeground,
				}}
			>
				Forms
			</Stack.Title>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					icon="folder.fill"
					accessibilityLabel="Document vault"
					onPress={() => router.push('/documents')}
				/>
			</Stack.Toolbar>

			<View className="flex-1">
				<TabIntro
					prefKey="formsIntroDismissed"
					hero={<FilingStackHero width={104} />}
					title={'Let’s get your\nrenewal moving.'}
					body="Immifile turns a stack of confusing forms into a few plain questions — and keeps every document and deadline in one place."
					features={[
						{
							icon: 'messages-square',
							title: 'Plain-language questions',
							detail: 'Answer in everyday words — we turn them into the right USCIS forms.',
						},
						{
							icon: 'calendar-clock',
							title: 'Never miss a deadline',
							detail: 'Reminders for every filing window, renewal, and expiring document.',
						},
						{
							icon: 'printer',
							title: 'Print-ready filing',
							detail: 'Export a clean, USCIS-ready packet the moment your answers are done.',
						},
					]}
				>
					<HomeScreen />
				</TabIntro>
			</View>
		</>
	)
}
