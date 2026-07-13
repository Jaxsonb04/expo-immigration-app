import { CaseTrackingHero, TabIntro } from '@/components/core'
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
				<TabIntro
					prefKey="casesIntroDismissed"
					hero={<CaseTrackingHero width={108} />}
					title={'Follow every case,\nstart to card.'}
					body="Once you’ve filed with USCIS, add your receipt number and watch each case move."
					features={[
						{
							icon: 'ticket',
							title: 'Track by receipt number',
							detail: 'Add the number from your USCIS notice — one case per filing.',
						},
						{
							icon: 'route',
							title: 'A clear status timeline',
							detail: 'From received to biometrics to decision, every step in order.',
						},
						{
							icon: 'link',
							title: 'Linked to your filings',
							detail: 'Connect a case to the application you prepared here.',
						},
					]}
				>
					<CasesScreen />
				</TabIntro>
			</View>
		</>
	)
}
