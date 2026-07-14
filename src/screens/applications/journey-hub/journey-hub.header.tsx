import { progressLabel, situationLabel } from '@/lib/application-labels'
import { Chip, Typography } from 'heroui-native'
import { View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'

export function Header() {
	const { application, applicant, isUnlocked } = useJourneyHub()
	const label = situationLabel(application.formType, application.applicationKind)
	return (
		<View className="gap-hairline">
			<Typography.Paragraph color="muted">{applicant?.displayName}</Typography.Paragraph>
			<Typography.Heading className="text-2xl font-semibold">{label.primary}</Typography.Heading>
			<View className="flex-row items-center gap-tight">
				<Typography.Paragraph color="muted" className="text-sm">
					{label.secondary}
				</Typography.Paragraph>
				<Chip size="sm" variant="soft">
					<Chip.Label>{progressLabel({ ...application, isUnlocked })}</Chip.Label>
				</Chip>
			</View>
		</View>
	)
}
