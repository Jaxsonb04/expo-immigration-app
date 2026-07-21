import { SectionHeading } from '@/components/core'
import { caseStatusLabels, relativeTime } from '@/lib/application-labels'
import { useRouter } from 'expo-router'
import { Button, Chip, Separator, Typography } from 'heroui-native'
import { View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'

export function Track() {
	const router = useRouter()
	const detail = useJourneyHub()
	const linkedCase = detail.case
	// Nothing to track on a closed application with no case.
	if (linkedCase === null && detail.application.status === 'closed') return null
	if (linkedCase === null) {
		const isFiled = detail.application.status === 'filed'
		return (
			<View className="gap-section">
				<Separator />
				<View className="gap-tight">
					<SectionHeading title="Track" />
					<Typography.Paragraph color="muted">
						{isFiled
							? 'Filed. When your USCIS receipt notice arrives (usually 1–3 weeks), add the receipt number to follow the case here.'
							: 'After you mail your application, enter the receipt number from your USCIS notice to track it here.'}
					</Typography.Paragraph>
					{isFiled && (
						<Button variant="secondary" onPress={() => router.push('/new-case')}>
							<Button.Label>Add your receipt number</Button.Label>
						</Button>
					)}
				</View>
			</View>
		)
	}
	return (
		<View className="gap-section">
			<Separator />
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
		</View>
	)
}
