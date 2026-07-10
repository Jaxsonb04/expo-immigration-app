import { AccountSettingsScreen } from '@/screens/account'
import { Stack } from 'expo-router'

export default function AccountSettingsRoute() {
	return (
		<>
			<Stack.Title>Settings</Stack.Title>
			<AccountSettingsScreen />
		</>
	)
}
