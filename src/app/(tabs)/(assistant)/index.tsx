import { AssistantScreen } from '@/screens/assistant'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

export default function AssistantTab() {
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
				Assistant
			</Stack.Title>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					icon="person.fill"
					accessibilityLabel="Account"
					onPress={() => router.push('/account')}
				/>
			</Stack.Toolbar>

			<AssistantScreen />
		</>
	)
}
