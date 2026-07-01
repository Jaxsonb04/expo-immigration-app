import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { formatIsoDate, requirementLabel, situationLabel } from '@/lib/application-labels'
import { useRouter } from 'expo-router'
import { Typography } from 'heroui-native'
import { Pressable, View } from 'react-native'
import { useDashboard } from './home.context'
import type { AttentionItem } from './home.data'

function Heading() {
	const { attentionItems } = useDashboard()
	return <SectionHeading title="Needs attention" count={attentionItems.length} />
}

function Item(props: { item: AttentionItem }) {
	const router = useRouter()
	const { item } = props
	if (item.kind === 'documentExpiring') {
		return (
			<Pressable
				accessibilityRole="button"
				onPress={() => router.push('/documents')}
				className="flex-row items-center gap-3 py-2"
			>
				<StyledLucideIcon name="triangle-alert" size={20} className="text-danger" />
				<View className="flex-1">
					<Typography.Paragraph className="font-medium">
						{item.label ?? item.documentType} expires {formatIsoDate(item.expiryDate)}
					</Typography.Paragraph>
					<Typography.Paragraph color="muted" className="text-sm">
						{item.applicantName}
						{item.affectsApplicationCount > 0 &&
							` · affects ${item.affectsApplicationCount} ${item.affectsApplicationCount === 1 ? 'application' : 'applications'}`}
					</Typography.Paragraph>
				</View>
			</Pressable>
		)
	}
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => router.push(`/application/${item.applicationId}`)}
			className="flex-row items-center gap-3 py-2"
		>
			<StyledLucideIcon name="file-plus" size={20} className="text-warning" />
			<View className="flex-1">
				<Typography.Paragraph className="font-medium">
					{requirementLabel(item.requirementKey)} needed
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm">
					{item.applicantName} · {situationLabel(item.formType, item.applicationKind).primary}
				</Typography.Paragraph>
			</View>
		</Pressable>
	)
}

function List() {
	const { attentionItems } = useDashboard()
	return (
		<>
			{attentionItems.map((item, index) => (
				<Item key={index} item={item} />
			))}
		</>
	)
}

export const Attention = {
	Heading,
	List,
	Item,
}
