import { useTabLayoutStyle } from '@/hooks/use-layout-style'
import { NativeTabs } from 'expo-router/unstable-native-tabs'

export default function TabsLayout() {
	const { tabBarStyle } = useTabLayoutStyle()
	return (
		<NativeTabs {...tabBarStyle} sidebarAdaptable>
			<NativeTabs.Trigger name="(home)">
				<NativeTabs.Trigger.Icon sf="house.fill" md="home" />
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="documents">
				<NativeTabs.Trigger.Icon sf="doc.text.fill" md="description" />
				<NativeTabs.Trigger.Label>Documents</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	)
}
