import { HomeScreen } from '@/screens/home'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

// The Forms tab is the applications surface and the app's default tab — its
// route group `(forms)` holds the index route `/` (MASTER_PLAN Layout, M6-T1).
// It renders the applications dashboard (`HomeScreen`); the Document Vault
// lives one level deeper at `/documents`, reachable from the header action
// below and from attention items on the dashboard (ADR-0003 amended
// 2026-07-05, MASTER_PLAN Layout: "Document Vault … from header actions and
// Forms").
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
				<Stack.Toolbar.Button
					icon="person.fill"
					accessibilityLabel="Account"
					onPress={() => router.push('/account')}
				/>
			</Stack.Toolbar>

			<HomeScreen />
		</>
	)
}
