import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { requirementLabel, situationLabel } from '@/lib/application-labels'
import { useRouter } from 'expo-router'
import { Typography } from 'heroui-native'
import { Pressable, View } from 'react-native'
import { useVaultContext } from './documents.context'
import type { NeededSlot } from './documents.data'

function Heading() {
	const { neededSlots } = useVaultContext()
	return <SectionHeading title="Needed for your applications" count={neededSlots.length} />
}

function Item(props: { slot: NeededSlot }) {
	const router = useRouter()
	const { slot } = props
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => router.push(`/forms/application/${slot.applicationId}`)}
			className="flex-row items-center gap-3 py-2"
		>
			<StyledLucideIcon name="file-plus" size={20} className="text-warning" />
			<View className="flex-1">
				<Typography.Paragraph className="font-medium">
					{requirementLabel(slot.requirementKey)}
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm">
					{slot.applicantName} · {situationLabel(slot.formType, slot.applicationKind).primary}
				</Typography.Paragraph>
			</View>
		</Pressable>
	)
}

function List() {
	const { neededSlots } = useVaultContext()
	return (
		<>
			{neededSlots.map((slot) => (
				<Item key={slot.slotId} slot={slot} />
			))}
		</>
	)
}

export const NeededDocuments = {
	Heading,
	List,
	Item,
}
