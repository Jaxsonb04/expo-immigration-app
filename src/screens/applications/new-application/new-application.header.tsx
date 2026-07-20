import { Typography } from 'heroui-native'
import { View } from 'react-native'

export function Header() {
	return (
		<View className="gap-hairline">
			<Typography.Paragraph color="muted">
				Answer plain-language questions and preview your form as you go. The USCIS filing fee is
				separate, paid to USCIS directly.
			</Typography.Paragraph>
		</View>
	)
}
