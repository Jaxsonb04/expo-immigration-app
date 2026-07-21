import { SectionHeading } from '@/components/core'
import { humanErrorMessage } from '@/lib/error-message'
import { useRouter } from 'expo-router'
import { Button, Separator, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'
import { useCloseApplication, useDeleteApplication, useReopenApplication } from './journey-hub.data'

/**
 * Lifecycle housekeeping for the application (workflow repair, filed
 * lifecycle): close an abandoned draft so it stops nagging on Home, delete a
 * draft or closed application outright, reopen a closed one, and un-file a
 * mistaken "filed" (only while no USCIS case is linked — after that,
 * corrections happen with USCIS). Every action confirms before mutating; the
 * server enforces the same rules again.
 */
export function Manage() {
	const router = useRouter()
	const detail = useJourneyHub()
	const { application } = detail
	const closeApplication = useCloseApplication()
	const reopenApplication = useReopenApplication()
	const deleteApplication = useDeleteApplication()
	const [busy, setBusy] = useState(false)

	async function run(action: () => Promise<unknown>, failureTitle: string, thenBack = false) {
		setBusy(true)
		try {
			await action()
			if (thenBack) router.back()
		} catch (error) {
			Alert.alert(failureTitle, humanErrorMessage(error, 'Please try again.'))
		} finally {
			setBusy(false)
		}
	}

	function confirmClose() {
		Alert.alert(
			'Close this application?',
			'It moves out of your active work. Nothing is deleted, and you can reopen it any time.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Close application',
					onPress: () =>
						void run(() => closeApplication({ applicationId: application._id }), 'Could not close'),
				},
			],
		)
	}

	function confirmDelete() {
		Alert.alert(
			'Delete this application?',
			'Its answers and document checklist are permanently deleted. Documents in your Vault are kept. This cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					// Leave the screen BEFORE the delete commits: the hub's live
					// query re-runs the moment the row is gone, and the list
					// behind us updates reactively. On failure the alert still
					// surfaces over whatever screen is showing.
					onPress: () => {
						router.back()
						void run(
							() => deleteApplication({ applicationId: application._id }),
							'Could not delete',
						)
					},
				},
			],
		)
	}

	function confirmUnfile() {
		Alert.alert(
			'Move back to draft?',
			'This removes the filed date and unlocks editing. Only do this if you marked the application filed by mistake — it doesn’t undo anything with USCIS.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Move to draft',
					style: 'destructive',
					onPress: () =>
						void run(
							() => reopenApplication({ applicationId: application._id }),
							'Could not reopen',
						),
				},
			],
		)
	}

	const actions: { key: string; label: string; onPress: () => void }[] = []
	if (application.status === 'draft') {
		actions.push(
			{ key: 'close', label: 'Close application', onPress: confirmClose },
			{ key: 'delete', label: 'Delete application', onPress: confirmDelete },
		)
	} else if (application.status === 'filed' && detail.case === null) {
		actions.push({
			key: 'unfile',
			label: 'Marked filed by mistake? Move back to draft',
			onPress: confirmUnfile,
		})
	} else if (application.status === 'closed') {
		actions.push(
			{
				key: 'reopen',
				label: 'Reopen application',
				onPress: () =>
					void run(() => reopenApplication({ applicationId: application._id }), 'Could not reopen'),
			},
			{ key: 'delete', label: 'Delete application', onPress: confirmDelete },
		)
	}

	if (actions.length === 0) return null

	return (
		<View className="gap-section">
			<Separator />
			<View className="gap-tight">
				<SectionHeading title="Manage" />
				{application.status === 'closed' && (
					<Typography.Paragraph color="muted" type="body-sm">
						{application.filedAt !== undefined
							? 'This application is closed. Reopening restores it as filed — the filing record stays.'
							: 'This application is closed. Reopen it to keep working on it.'}
					</Typography.Paragraph>
				)}
				{actions.map((action) => (
					<Button key={action.key} variant="ghost" isDisabled={busy} onPress={action.onPress}>
						<Button.Label>{action.label}</Button.Label>
					</Button>
				))}
			</View>
		</View>
	)
}
