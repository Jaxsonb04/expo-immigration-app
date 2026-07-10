import { ProfileScreen } from '@/screens/profile'
import { Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

/** Full-screen Profile page off the header avatar (M6-T5, MASTER_PLAN Layout).
 * The route stays `/account` so every existing header button keeps working. */
export default function ProfileRoute() {
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
				Profile
			</Stack.Title>

			<ProfileScreen />
		</>
	)
}
