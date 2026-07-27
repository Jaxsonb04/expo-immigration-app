import { ResourcesScreen } from '@/screens/resources'
import { Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

export default function ResourcesTab() {
	const foreground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Fraunces_600SemiBold',
					color: foreground,
				}}
			>
				Resources
			</Stack.Title>
			<ResourcesScreen />
		</>
	)
}
