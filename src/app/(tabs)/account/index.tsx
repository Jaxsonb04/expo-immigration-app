import { ProfileScreen } from '@/screens/profile'
import { Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

/** The Account tab (M7-T1, MASTER_PLAN Layout) — identity, personal details,
 * documents, and settings. Replaces the old header-avatar Profile modal. */
export default function AccountTab() {
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
				Account
			</Stack.Title>

			<ProfileScreen />
		</>
	)
}
