import { Typography } from 'heroui-native'
import { View } from 'react-native'

export function Header() {
	return (
		<View className="gap-1">
			<Typography.Paragraph color="muted">
				Your print-ready filing package is included. The USCIS filing fee is separate, paid to USCIS directly.
			</Typography.Paragraph>
		</View>
	)
}
