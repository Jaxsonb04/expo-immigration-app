import { BodyScrollView } from '@/components/core/body-scroll-view'
import { Stack } from 'expo-router'
import { Typography, useThemeColor } from 'heroui-native'
import type { JSX } from 'react'

export default function AccountTab(): JSX.Element {
	const themeColorForeground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Fredoka_600SemiBold',
					color: themeColorForeground,
				}}
			>
				Account
			</Stack.Title>

			<BodyScrollView>
				<Typography.Paragraph color="muted">
					Settings, sign-in, and data export will live here.
				</Typography.Paragraph>
			</BodyScrollView>
		</>
	)
}
