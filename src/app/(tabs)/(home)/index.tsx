import { HomeScreen } from '@/screens/home'
import { router, Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

export default function HomeTab() {
	const themeColorForeground = useThemeColor('foreground')
	return (
		<>
			<Stack.Title
				large
				largeStyle={{
					fontFamily: 'Montserrat_600SemiBold',
					color: themeColorForeground,
				}}
			>
				Home
			</Stack.Title>
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button icon="person.fill" onPress={() => router.push('/account')} />
			</Stack.Toolbar>

			<HomeScreen />
		</>
	)
}
