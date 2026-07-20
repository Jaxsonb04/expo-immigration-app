import { ReviewScreen } from '@/screens/applications'
import type { Id } from '@convex/_generated/dataModel'
import { Stack, useLocalSearchParams } from 'expo-router'

export default function ReviewRoute() {
	const { applicationId } = useLocalSearchParams<{ applicationId: string }>()
	return (
		<>
			<Stack.Title>Review</Stack.Title>
			<ReviewScreen applicationId={applicationId as Id<'applications'>} />
		</>
	)
}
