import * as Notifications from 'expo-notifications'
import { planReminders, type ReminderDocument } from './reminders'

// M5-T1 renewal reminders — the imperative half. Reminders are LOCAL
// notifications only (no server push): everything is derived on-device from
// the Vault's expiry dates, so a reschedule is a wipe-and-rewrite sync that
// is safe and idempotent to run any time the document list changes. Keep all
// expo-notifications usage in this file so ./reminders stays vitest-pure.

export type SyncRemindersResult =
	| { status: 'scheduled'; count: number }
	| { status: 'permission-denied' }

async function ensurePermission(): Promise<boolean> {
	const current = await Notifications.getPermissionsAsync()
	if (current.granted) return true
	const requested = await Notifications.requestPermissionsAsync()
	return requested.granted
}

/**
 * Idempotent reschedule: requests permission if needed, cancels every
 * previously-scheduled reminder, then schedules the current plan. Call it
 * when reminders are enabled and again whenever the vault's documents change;
 * call cancelReminders() when the toggle turns off. Permission denial comes
 * back as a value (never a throw) so the UI can point the person at Settings.
 */
export async function syncReminders(
	documents: readonly ReminderDocument[],
): Promise<SyncRemindersResult> {
	if (!(await ensurePermission())) return { status: 'permission-denied' }
	await Notifications.cancelAllScheduledNotificationsAsync()
	const plan = planReminders(documents, new Date())
	await Promise.all(
		plan.map((reminder) =>
			Notifications.scheduleNotificationAsync({
				content: { title: reminder.title, body: reminder.body },
				trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date },
			}),
		),
	)
	return { status: 'scheduled', count: plan.length }
}

/** Remove every scheduled reminder (the toggle-off path). */
export async function cancelReminders(): Promise<void> {
	await Notifications.cancelAllScheduledNotificationsAsync()
}
