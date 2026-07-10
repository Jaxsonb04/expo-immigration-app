import { AccountDetailsScreen } from '@/screens/account'
import { Stack } from 'expo-router'

export default function AccountDetailsRoute() {
	return (
		<>
			<Stack.Title>Personal details</Stack.Title>
			<AccountDetailsScreen />
		</>
	)
}
