import type { ReminderDocument } from './reminders'

// Notification scheduling belongs to the filing/document surface, which is
// intentionally absent from the first App Store review build. Keep this
// module-shaped no-op so dormant source can still compile without linking the
// expo-notifications native capability. Restore the implementation together
// with the filing release flag in a later reviewed release.
export type SyncRemindersResult = { status: 'permission-denied' }

/**
 * Preserve the former call contract while refusing to enable reminders in
 * this release. The documents route is blocked before this can be reached.
 */
export async function syncReminders(
	_documents: readonly ReminderDocument[],
): Promise<SyncRemindersResult> {
	return { status: 'permission-denied' }
}

/** No native reminders are scheduled in this release. */
export async function cancelReminders(): Promise<void> {
	return
}
