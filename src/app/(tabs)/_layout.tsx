import { TabBarContext } from '@/hooks/use-tab-bar'
import { useTabLayoutStyle } from '@/hooks/use-layout-style'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { useMemo, useState } from 'react'

// Tab order is a product decision (MASTER_PLAN Layout, M7-T1): Forms is the
// primary surface and holds the index route, so the app opens there. The
// assistant is not a tab — it lives in the floating Ask bubble (M7-T2).
export default function TabsLayout() {
	const { tabBarStyle } = useTabLayoutStyle()
	// Full-surface moments (the one-time tab intros) hide the bar entirely so
	// nothing competes with them; TabIntro drives this via TabBarContext.
	const [isTabBarHidden, setIsTabBarHidden] = useState(false)
	const tabBarContext = useMemo(() => ({ setIsTabBarHidden }), [])
	return (
		<TabBarContext value={tabBarContext}>
			<NativeTabs {...tabBarStyle} hidden={isTabBarHidden} sidebarAdaptable>
				<NativeTabs.Trigger name="(forms)">
					<NativeTabs.Trigger.Icon sf="doc.text.fill" md="description" />
					<NativeTabs.Trigger.Label>Forms</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="cases">
					<NativeTabs.Trigger.Icon sf="tray.full.fill" md="inbox" />
					<NativeTabs.Trigger.Label>Cases</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="community">
					<NativeTabs.Trigger.Icon sf="person.2.fill" md="groups" />
					<NativeTabs.Trigger.Label>Forum</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="account">
					<NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
					<NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
				</NativeTabs.Trigger>
			</NativeTabs>
		</TabBarContext>
	)
}
