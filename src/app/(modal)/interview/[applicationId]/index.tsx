import { InterviewScreen } from '@/screens/interview'
import type { Id } from '@convex/_generated/dataModel'
import { useLocalSearchParams } from 'expo-router'

export default function InterviewRoute() {
	// stepKey + mode are set only when the review screen opens a single step to
	// edit; a normal wizard launch passes neither.
	const { applicationId, stepKey, mode } = useLocalSearchParams<{
		applicationId: string
		stepKey?: string
		mode?: string
	}>()
	return (
		<InterviewScreen
			applicationId={applicationId as Id<'applications'>}
			startStepKey={stepKey}
			singleStep={mode === 'single'}
		/>
	)
}
