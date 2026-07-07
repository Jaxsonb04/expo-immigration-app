import { HomeScreen } from '@/screens/home'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

// The Forms tab is the applications surface. It currently renders the existing
// applications dashboard (`HomeScreen`); the Document Vault lives one level
// deeper at `/forms/documents`, reachable from the header action below and from
// attention items on the dashboard (ADR-0003 amended 2026-07-05, MASTER_PLAN
// Layout: "Document Vault ... accessible from header actions and Forms").
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
				<Stack.Toolbar.Button icon="folder.fill" onPress={() => router.push('/forms/documents')} />
				<Stack.Toolbar.Button icon="person.fill" onPress={() => router.push('/account')} />
			</Stack.Toolbar>

			<HomeScreen />
		</>
	)
}
