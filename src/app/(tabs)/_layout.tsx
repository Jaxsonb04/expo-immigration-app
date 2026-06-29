import { NativeTabs } from 'expo-router/unstable-native-tabs'
import type { JSX } from 'react'
import { useTabLayoutStyle } from '@/hooks/use-layout-style'

export default function TabsLayout(): JSX.Element {
	const { tabBarStyle } = useTabLayoutStyle()
	return (
		<NativeTabs {...tabBarStyle} sidebarAdaptable>
			<NativeTabs.Trigger name="index">
				<NativeTabs.Trigger.Icon sf="house.fill" md="home" />
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="explore">
				<NativeTabs.Trigger.Icon sf="safari.fill" md="explore" />
				<NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	)
}
