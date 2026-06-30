import { Button, Card, Label, Select, Separator, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import type { Case } from '../cases.data'
import { useUpdateCaseStatus } from '../cases.data'
import { CASE_STATUS_OPTIONS, type CaseStatusOption } from '../cases.schema'
import { CaseStatusTimeline } from './status-timeline'

const STATUS_OPTIONS = CASE_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))

const FORM_TYPE_LABEL: Record<NonNullable<Case['formType']>, string> = {
	i90: 'Form I-90',
	i765: 'Form I-765',
}

/**
 * One tracked case: its Receipt Number and current status, the full status
 * history timeline, and an inline control to record a new status (which appends
 * to the timeline — ADR-0008, manual entry).
 */
export function CaseCard({ case: theCase }: { case: Case }) {
	const updateStatus = useUpdateCaseStatus()
	const [nextStatus, setNextStatus] = useState<CaseStatusOption>(
		theCase.currentStatus as CaseStatusOption,
	)
	const [pending, setPending] = useState(false)
	const selected = STATUS_OPTIONS.find((option) => option.value === nextStatus)

	async function handleUpdate(): Promise<void> {
		if (nextStatus === theCase.currentStatus) {
			return
		}
		setPending(true)
		try {
			await updateStatus({ caseId: theCase._id, status: nextStatus })
		} catch (err) {
			Alert.alert('Could not update', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			setPending(false)
		}
	}

	return (
		<Card className="gap-4 p-5">
			<View className="flex-row items-start justify-between gap-3">
				<View className="flex-1 gap-1">
					<Typography.Paragraph className="text-lg font-semibold">
						{theCase.receiptNumber}
					</Typography.Paragraph>
					{theCase.formType ? (
						<Typography.Paragraph color="muted" className="text-sm">
							{FORM_TYPE_LABEL[theCase.formType]}
						</Typography.Paragraph>
					) : null}
				</View>
				<View className="rounded-full bg-default px-3 py-1">
					<Typography.Paragraph className="text-sm font-medium text-accent">
						{theCase.currentStatus}
					</Typography.Paragraph>
				</View>
			</View>

			<CaseStatusTimeline history={theCase.history} />

			<Separator />

			<View className="gap-3">
				<Label>Update status</Label>
				<Select
					value={selected}
					onValueChange={(option) => {
						if (option) {
							setNextStatus(option.value as CaseStatusOption)
						}
					}}
					isDisabled={pending}
				>
					<Select.Trigger>
						<Select.Value placeholder="Select a status" />
						<Select.TriggerIndicator />
					</Select.Trigger>
					<Select.Portal>
						<Select.Overlay />
						<Select.Content presentation="popover" width="trigger">
							{STATUS_OPTIONS.map((option) => (
								<Select.Item key={option.value} value={option.value} label={option.label} />
							))}
						</Select.Content>
					</Select.Portal>
				</Select>
				<Button isDisabled={pending || nextStatus === theCase.currentStatus} onPress={handleUpdate}>
					<Button.Label>{pending ? 'Updating…' : 'Save status'}</Button.Label>
				</Button>
			</View>
		</Card>
	)
}
