import { AccountHero, TabIntro } from '@/components/core'
import { AccountScreen } from '@/screens/account'
import { Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'
import { View } from 'react-native'

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

			<View className="flex-1">
				<AccountScreen />
				<TabIntro
					prefKey="accountIntroDismissed"
					hero={<AccountHero size={104} />}
					title={'Enter it once.\nUse it everywhere.'}
					body="Your details and documents live here — every form you start is prefilled from them."
					features={[
						{
							icon: 'user-round',
							title: 'Your details, reused',
							detail: 'Name, dates, and address prefill every filing you start.',
						},
						{
							icon: 'folder',
							title: 'Documents on file',
							detail: 'Upload once — attach the same document to any filing.',
						},
						{
							icon: 'shield-check',
							title: 'Yours to control',
							detail: 'Everything can be erased permanently, any time, from Settings.',
						},
					]}
				/>
			</View>
		</>
	)
}
