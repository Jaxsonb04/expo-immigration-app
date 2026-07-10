import { CompletedScreen } from '@/screens/home'
import { Stack } from 'expo-router'

export default function CompletedRoute() {
	return (
		<>
			<Stack.Title>Completed</Stack.Title>
			<CompletedScreen />
		</>
	)
}
