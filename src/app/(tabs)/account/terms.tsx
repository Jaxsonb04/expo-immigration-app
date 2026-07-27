import { TermsOfUseScreen } from '@/screens/account'
import { Stack } from 'expo-router'

export default function TermsOfUseRoute() {
	return (
		<>
			<Stack.Title>Terms of use</Stack.Title>
			<TermsOfUseScreen />
		</>
	)
}
