import { AskBubble } from '@/components/core'
import { CasesScreen } from '@/screens/cases'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'
import { View } from 'react-native'

export default function CasesTab() {
	const themeColorForeground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Fraunces_600SemiBold',
					color: themeColorForeground,
				}}
			>
				Cases
			</Stack.Title>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					icon="plus"
					accessibilityLabel="New case"
					onPress={() => router.push('/new-case')}
				/>
			</Stack.Toolbar>

			<View className="flex-1">
				<CasesScreen />
				<AskBubble />
			</View>
		</>
	)
}
