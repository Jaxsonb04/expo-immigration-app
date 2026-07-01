import { SectionHeading } from '@/components/core'
import { Button, Typography } from 'heroui-native'
import { View } from 'react-native'
import { useInterviewDone, useJourneyHub } from './journey-hub.context'
import { comingSoon } from './journey-hub.utils'

export function ReviewPay() {
	const { application, isUnlocked } = useJourneyHub()
	const interviewDone = useInterviewDone()
	const isDraft = application.status === 'draft'
	return (
		<View className="gap-2">
			<SectionHeading title="Review & Pay" />
			<Typography.Paragraph color="muted">
				{isUnlocked
					? 'Unlocked — download your filing package anytime, edits included.'
					: 'Preview your completed form for free. Pay once to download the print-ready filing package. The government filing fee is separate and paid to USCIS directly.'}
			</Typography.Paragraph>
			{isDraft && (
				<Button
					variant="secondary"
					isDisabled={!interviewDone}
					onPress={() => comingSoon(isUnlocked ? 'Filing package' : 'Preview & pay')}
				>
					<Button.Label>{isUnlocked ? 'Get filing package' : 'Preview & pay'}</Button.Label>
				</Button>
			)}
		</View>
	)
}
