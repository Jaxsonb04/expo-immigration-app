import { DraftsScreen } from '@/screens/home'
import { Stack } from 'expo-router'

export default function DraftsRoute() {
	return (
		<>
			<Stack.Title>In progress</Stack.Title>
			<DraftsScreen />
		</>
	)
}
