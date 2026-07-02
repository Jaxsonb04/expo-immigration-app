import { Typography } from 'heroui-native'
import { View } from 'react-native'

/** Full-width section heading with an optional trailing count. */
export function SectionHeading(props: { title: string; count?: number }) {
	return (
		<View className="flex-row items-center justify-between">
			<Typography.Heading className="text-lg font-semibold">{props.title}</Typography.Heading>
			{props.count !== undefined && (
				<Typography.Paragraph color="muted" className="text-sm">
					{props.count}
				</Typography.Paragraph>
			)}
		</View>
	)
}
