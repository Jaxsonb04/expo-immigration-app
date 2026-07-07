import { Typography } from 'heroui-native'
import { View } from 'react-native'

export function Header() {
	return (
		<View className="gap-1">
			<Typography.Heading>Start an application</Typography.Heading>
			<Typography.Paragraph color="muted">
				Everything is free — including your print-ready filing package. The USCIS filing fee is separate, paid to USCIS directly.
			</Typography.Paragraph>
		</View>
	)
}
