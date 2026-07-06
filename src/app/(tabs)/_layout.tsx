import { useTabLayoutStyle } from '@/hooks/use-layout-style'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

export default function TabsLayout() {
	const { tabBarStyle } = useTabLayoutStyle()
	return (
		<NativeTabs {...tabBarStyle} sidebarAdaptable>
			<NativeTabs.Trigger name="(assistant)">
				<NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
				<NativeTabs.Trigger.Label>Assistant</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="forms">
				<NativeTabs.Trigger.Icon sf="doc.text.fill" md="description" />
				<NativeTabs.Trigger.Label>Forms</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="cases">
				<NativeTabs.Trigger.Icon sf="tray.full.fill" md="inbox" />
				<NativeTabs.Trigger.Label>Cases</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="community">
				<NativeTabs.Trigger.Icon sf="person.2.fill" md="groups" />
				<NativeTabs.Trigger.Label>Community</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	)
}
