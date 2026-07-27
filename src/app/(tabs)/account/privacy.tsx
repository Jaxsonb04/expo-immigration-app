import { PrivacyPolicyScreen } from '@/screens/account'
import { Stack } from 'expo-router'

export default function PrivacyPolicyRoute() {
	return (
		<>
			<Stack.Title>Privacy policy</Stack.Title>
			<PrivacyPolicyScreen />
		</>
	)
}
