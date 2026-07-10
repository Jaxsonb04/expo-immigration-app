import { useTabLayoutStyle } from '@/hooks/use-layout-style'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

// Tab order is a product decision (MASTER_PLAN Layout, M7-T1): Forms is the
// primary surface and holds the index route, so the app opens there. The
// assistant is not a tab — it lives in the floating Ask bubble (M7-T2).
export default function TabsLayout() {
	const { tabBarStyle } = useTabLayoutStyle()
	return (
		<NativeTabs {...tabBarStyle} sidebarAdaptable>
			<NativeTabs.Trigger name="(forms)">
				<NativeTabs.Trigger.Icon sf="doc.text.fill" md="description" />
				<NativeTabs.Trigger.Label>Forms</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="cases">
				<NativeTabs.Trigger.Icon sf="tray.full.fill" md="inbox" />
				<NativeTabs.Trigger.Label>Cases</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="community">
				<NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" md="forum" />
				<NativeTabs.Trigger.Label>Forum</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="account">
				<NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
				<NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	)
}
