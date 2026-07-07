import { useRequireAccount } from '@/components/account'
import { StyledLucideIcon } from '@/components/styled-icon'
import type { ReminderDocument } from '@/lib/reminders'
import { cancelReminders, syncReminders } from '@/lib/reminders.sync'
import * as SecureStore from 'expo-secure-store'
import { Surface, Switch, Typography } from 'heroui-native'
import { useEffect, useMemo, useState } from 'react'
import { Alert, View } from 'react-native'
import { useVaultContext } from './documents.context'
import type { Vault } from './documents.data'

// M5-T1 renewal reminders. Local notifications planned from the Vault's
// current documents (src/lib/reminders*). Enabling is double-gated: first the
// account gate (reminders must survive a new phone, so they need an account
// the person can sign back into), then the OS notification permission. The
// preference itself lives in SecureStore — the same store the codebase
// already uses — keyed per device, since scheduled notifications are per
// device anyway.

const REMINDERS_ENABLED_KEY = 'immifile.renewal-reminders-enabled'

function toReminderDocuments(vault: Vault): ReminderDocument[] {
	return vault.documents.map((document) => ({
		id: document._id,
		type: document.type,
		label: document.label,
		expiryDate: document.expiryDate,
		isCurrent: document.isCurrent,
	}))
}

export function RenewalReminders() {
	const vault = useVaultContext()
	const requireAccount = useRequireAccount()
	const [isEnabled, setIsEnabled] = useState(false)
	// Until the stored preference loads, the switch is disabled so a tap can't
	// race the read.
	const [isLoaded, setIsLoaded] = useState(false)

	useEffect(() => {
		let isCancelled = false
		SecureStore.getItemAsync(REMINDERS_ENABLED_KEY)
			.then((stored) => {
				if (isCancelled) return
				setIsEnabled(stored === 'true')
				setIsLoaded(true)
			})
			.catch(() => {
				// Unreadable preference → treat as off; the person can re-enable.
				if (!isCancelled) setIsLoaded(true)
			})
		return () => {
			isCancelled = true
		}
	}, [])

	const reminderDocuments = useMemo(() => toReminderDocuments(vault), [vault])

	// Rescheduling = the same idempotent sync: while reminders are on, re-run
	// it whenever the vault payload changes (new upload, new version, edited
	// expiry). syncReminders wipes and rewrites, so this converges.
	useEffect(() => {
		if (!isLoaded || !isEnabled) return
		syncReminders(reminderDocuments).catch(() => {
			// A failed background resync self-heals on the next vault change;
			// the enable path below is where failures surface to the person.
		})
	}, [isLoaded, isEnabled, reminderDocuments])

	async function handleToggle(next: boolean): Promise<void> {
		try {
			if (!next) {
				setIsEnabled(false)
				await SecureStore.setItemAsync(REMINDERS_ENABLED_KEY, 'false')
				await cancelReminders()
				return
			}
			// Account gate first: anonymous users get the upgrade sheet and the
			// switch only turns on once they hold a recoverable account.
			const hasAccount = await requireAccount({
				title: 'Keep your reminders',
				description:
					'Renewal reminders need an account you can sign back into, so nothing is lost if you switch phones.',
			})
			if (!hasAccount) return
			const result = await syncReminders(reminderDocuments)
			if (result.status === 'permission-denied') {
				Alert.alert(
					'Notifications are off',
					'To get renewal reminders, allow notifications for Immifile in your device Settings, then flip this switch again.',
				)
				return
			}
			setIsEnabled(true)
			await SecureStore.setItemAsync(REMINDERS_ENABLED_KEY, 'true')
		} catch {
			Alert.alert('Something went wrong', 'Reminders could not be updated. Please try again.')
		}
	}

	return (
		<Surface variant="secondary" className="flex-row items-center gap-3 rounded-2xl p-4">
			<StyledLucideIcon name="bell" size={20} className="text-muted" />
			<View className="flex-1 gap-0.5">
				<Typography.Paragraph className="font-medium">Renewal reminders</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm">
					Get reminded 180, 90, 30, 7, and 1 day before a document expires.
				</Typography.Paragraph>
			</View>
			<Switch
				accessibilityLabel="Renewal reminders"
				isSelected={isEnabled}
				isDisabled={!isLoaded}
				onSelectedChange={(next) => {
					void handleToggle(next)
				}}
			/>
		</Surface>
	)
}
