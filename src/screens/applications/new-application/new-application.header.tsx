import { Typography } from 'heroui-native'
import { View } from 'react-native'

export function Header() {
	return (
		<View className="gap-1">
			<Typography.Heading>Start an application</Typography.Heading>
			<Typography.Paragraph color="muted">
				Everything is free to prepare — you only pay when you download your filing package.
			</Typography.Paragraph>
		</View>
	)
}
