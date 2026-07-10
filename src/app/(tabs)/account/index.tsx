import { AccountScreen } from '@/screens/account'
import { Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'

/** The Account tab (M7-T1/T3, MASTER_PLAN Layout) — identity preview and
 * progressively disclosed sections. Replaces the old header-avatar modal. */
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

			<AccountScreen />
		</>
	)
}
