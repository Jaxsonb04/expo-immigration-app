import { AttentionScreen } from '@/screens/home'
import { Stack } from 'expo-router'

export default function AttentionRoute() {
	return (
		<>
			<Stack.Title>Needs attention</Stack.Title>
			<AttentionScreen />
		</>
	)
}
