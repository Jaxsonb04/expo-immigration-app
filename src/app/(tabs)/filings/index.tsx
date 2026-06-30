import { BodyScrollView } from '@/components/core/body-scroll-view'
import { Stack } from 'expo-router'
import { Typography, useThemeColor } from 'heroui-native'
import type { JSX } from 'react'

export default function FilingsTab(): JSX.Element {
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
				Filings
			</Stack.Title>
			<BodyScrollView>
				<Typography.Paragraph color="muted">
					Track your immigration applications and their progress here.
				</Typography.Paragraph>
			</BodyScrollView>
		</>
	)
}
