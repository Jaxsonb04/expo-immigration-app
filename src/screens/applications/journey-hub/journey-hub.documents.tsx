import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { requirementLabel } from '@/lib/application-labels'
import { Typography } from 'heroui-native'
import { View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'

export function Documents() {
	const { requirements } = useJourneyHub()
	return (
		<View className="gap-2">
			<SectionHeading title="Documents" />
			{requirements.length === 0 && (
				<Typography.Paragraph color="muted">
					No documents are required for this application.
				</Typography.Paragraph>
			)}
			{requirements.map((slot) => (
				<View key={slot._id} className="flex-row items-center gap-3 py-1">
					{slot.status === 'attached' && (
						<StyledLucideIcon name="circle-check" size={20} className="text-success" />
					)}
					{slot.status === 'needed' && (
						<StyledLucideIcon name="circle-alert" size={20} className="text-warning" />
					)}
					{slot.status === 'waived' && (
						<StyledLucideIcon name="circle-minus" size={20} className="text-muted" />
					)}
					<Typography.Paragraph className="flex-1">
						{requirementLabel(slot.requirementKey)}
					</Typography.Paragraph>
					<Typography.Paragraph color="muted" className="text-sm capitalize">
						{slot.status}
					</Typography.Paragraph>
				</View>
			))}
		</View>
	)
}
