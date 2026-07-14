import { SectionHeading } from '@/components/core'
import { caseStatusLabels, relativeTime } from '@/lib/application-labels'
import { Chip, Typography } from 'heroui-native'
import { View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'

export function Track() {
	const detail = useJourneyHub()
	const linkedCase = detail.case
	if (linkedCase === null) {
		return (
			<View className="gap-tight">
				<SectionHeading title="Track" />
				<Typography.Paragraph color="muted">
					{detail.application.status === 'filed'
						? 'Filed. Add your receipt number to track this case — coming with case tracking.'
						: 'After you mail your application, enter the receipt number from your USCIS notice to track it here.'}
				</Typography.Paragraph>
			</View>
		)
	}
	return (
		<View className="gap-tight">
			<SectionHeading title="Track" />
			<View className="flex-row items-center gap-tight">
				<Typography.Paragraph className="font-medium">
					{caseStatusLabels[linkedCase.status]}
				</Typography.Paragraph>
				<Chip size="sm" variant="soft">
					<Chip.Label>{linkedCase.receiptNumber}</Chip.Label>
				</Chip>
			</View>
			{[...linkedCase.statusHistory].reverse().map((entry, index) => (
				<View key={`${entry.status}-${index}`} className="flex-row items-center gap-control">
					<Typography.Paragraph color="muted" className="text-sm w-20">
						{relativeTime(entry.occurredAt)}
					</Typography.Paragraph>
					<Typography.Paragraph className="text-sm">
						{caseStatusLabels[entry.status]}
					</Typography.Paragraph>
				</View>
			))}
		</View>
	)
}
