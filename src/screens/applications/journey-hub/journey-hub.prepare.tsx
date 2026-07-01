import { SectionHeading } from '@/components/core'
import { Button, Typography } from 'heroui-native'
import { View } from 'react-native'
import { useInterviewDone, useJourneyHub } from './journey-hub.context'
import { comingSoon } from './journey-hub.utils'

export function Prepare() {
	const { application } = useJourneyHub()
	const interviewDone = useInterviewDone()
	const isDraft = application.status === 'draft'
	return (
		<View className="gap-2">
			<SectionHeading title="Prepare" />
			<Typography.Paragraph color="muted">
				{interviewDone
					? 'Your answers are complete. You can revisit any step before filing.'
					: `Step ${Math.min(application.completedStepCount + 1, application.totalStepCount)} of ${application.totalStepCount} — answer a few plain-language questions.`}
			</Typography.Paragraph>
			{isDraft && (
				<Button
					variant={interviewDone ? 'secondary' : 'primary'}
					onPress={() => comingSoon('Interview')}
				>
					<Button.Label>{interviewDone ? 'Review answers' : 'Continue'}</Button.Label>
				</Button>
			)}
		</View>
	)
}
