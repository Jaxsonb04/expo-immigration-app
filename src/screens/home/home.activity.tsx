import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { relativeTime, situationLabel } from '@/lib/application-labels'
import { Typography } from 'heroui-native'
import { View } from 'react-native'
import { useDashboard } from './home.context'
import type { ActivityItem } from './home.data'

function Heading() {
	return <SectionHeading title="Recent activity" />
}

function Item(props: { item: ActivityItem }) {
	const { item } = props
	const title =
		item.kind === 'application'
			? `${situationLabel(item.formType, item.applicationKind).primary} updated`
			: item.kind === 'document'
				? `${item.label ?? item.documentType} added`
				: `Case ${item.receiptNumber} updated`
	const iconName =
		item.kind === 'application' ? 'file-text' : item.kind === 'document' ? 'paperclip' : 'landmark'
	return (
		<View className="flex-row items-center gap-3 py-2">
			<StyledLucideIcon name={iconName} size={18} className="text-muted" />
			<Typography.Paragraph className="flex-1">{title}</Typography.Paragraph>
			<Typography.Paragraph color="muted" className="text-sm">
				{relativeTime(item.at)}
			</Typography.Paragraph>
		</View>
	)
}

function List() {
	const { recentActivity } = useDashboard()
	return (
		<>
			{recentActivity.map((item, index) => (
				<Item key={index} item={item} />
			))}
		</>
	)
}

export const Activity = {
	Heading,
	List,
	Item,
}
