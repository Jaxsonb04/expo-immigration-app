import { RenewalsScreen } from '@/screens/home'
import { Stack } from 'expo-router'

export default function RenewalsRoute() {
	return (
		<>
			<Stack.Title>Renewals</Stack.Title>
			<RenewalsScreen />
		</>
	)
}
