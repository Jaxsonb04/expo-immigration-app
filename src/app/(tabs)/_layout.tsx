import { useTabLayoutStyle } from '@/hooks/use-layout-style'
import { NativeTabs } from 'expo-router/unstable-native-tabs'
import type { JSX } from 'react'

export default function TabsLayout(): JSX.Element {
	const { tabBarStyle } = useTabLayoutStyle()
	return (
		<NativeTabs {...tabBarStyle} sidebarAdaptable>
			<NativeTabs.Trigger name="(deadlines)">
				<NativeTabs.Trigger.Icon sf="calendar.badge.clock" md="event" />
				<NativeTabs.Trigger.Label>Deadlines</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="filings">
				<NativeTabs.Trigger.Icon sf="doc.text.fill" md="description" />
				<NativeTabs.Trigger.Label>Filings</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="vault">
				<NativeTabs.Trigger.Icon sf="lock.doc.fill" md="folder" />
				<NativeTabs.Trigger.Label>Vault</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
			<NativeTabs.Trigger name="account">
				<NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
				<NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
			</NativeTabs.Trigger>
		</NativeTabs>
	)
}
