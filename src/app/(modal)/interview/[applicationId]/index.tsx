import { InterviewScreen } from '@/screens/interview'
import type { Id } from '@convex/_generated/dataModel'
import { useLocalSearchParams } from 'expo-router'

export default function InterviewRoute() {
	const { applicationId } = useLocalSearchParams<{ applicationId: string }>()
	return <InterviewScreen applicationId={applicationId as Id<'applications'>} />
}
