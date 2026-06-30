import { BodyScrollView } from '@/components/core/body-scroll-view'
import { Stack } from 'expo-router'
import { Typography, useThemeColor } from 'heroui-native'
import type { JSX } from 'react'

export default function DeadlinesTab(): JSX.Element {
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
				Deadlines
			</Stack.Title>
			<BodyScrollView>
				<Typography.Paragraph color="muted">
					Upcoming immigration deadlines and reminders will appear here.
				</Typography.Paragraph>
			</BodyScrollView>
		</>
	)
}
