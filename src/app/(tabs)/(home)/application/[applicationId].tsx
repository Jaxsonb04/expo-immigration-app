import { JourneyHubScreen } from '@/screens/applications'
import type { Id } from '@convex/_generated/dataModel'
import { Stack, useLocalSearchParams } from 'expo-router'

export default function ApplicationRoute() {
	const { applicationId } = useLocalSearchParams<{ applicationId: string }>()
	return (
		<>
			<Stack.Title>Application</Stack.Title>
			<JourneyHubScreen applicationId={applicationId as Id<'applications'>} />
		</>
	)
}
