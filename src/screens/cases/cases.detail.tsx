import { BodyScrollView, ScreenError, ScreenLoading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { caseStatusLabels } from '@/lib/application-labels'
import type { Id } from '@convex/_generated/dataModel'
import { caseStatuses, type CaseStatus } from '@convex/shared/applicationShapes'
import { Alert, Button, Chip, Input, Separator, Surface, TextField, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert as RNAlert, Linking, Pressable, View } from 'react-native'
import {
	USCIS_CASE_STATUS_URL,
	formatCaseDate,
	statusTone,
	useAddStatusUpdate,
	useCase,
	type CaseDetail,
} from './cases.data'

const DOT_COLOR = { attention: 'bg-warning', positive: 'bg-success', neutral: 'bg-muted' } as const

type TimelineEntry = CaseDetail['statusHistory'][number]

function TimelineRow({ entry, isLatest }: { entry: TimelineEntry; isLatest: boolean }) {
	const tone = statusTone(entry.status)
	return (
		<View className="flex-row gap-3">
			<View className="items-center pt-1">
				<View className={`h-3 w-3 rounded-full ${DOT_COLOR[tone]}`} />
			</View>
			<View className="flex-1 gap-0.5 pb-4">
				<Typography.Paragraph className={isLatest ? 'font-semibold' : 'font-medium'}>
					{caseStatusLabels[entry.status]}
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-xs tabular-nums">
					{formatCaseDate(entry.occurredAt)}
				</Typography.Paragraph>
				{entry.note ? (
					<Typography.Paragraph className="text-sm leading-relaxed">
						{entry.note}
					</Typography.Paragraph>
				) : null}
			</View>
		</View>
	)
}

function AddUpdate({ caseId }: { caseId: Id<'cases'> }) {
	const addStatusUpdate = useAddStatusUpdate()
	const [open, setOpen] = useState(false)
	const [status, setStatus] = useState<CaseStatus | null>(null)
	const [note, setNote] = useState('')
	const [busy, setBusy] = useState(false)

	async function save() {
		if (status === null) return
		setBusy(true)
		try {
			await addStatusUpdate({ caseId, status, note: note.trim() || undefined })
			setOpen(false)
			setStatus(null)
			setNote('')
		} catch (error) {
			RNAlert.alert('Could not add update', error instanceof Error ? error.message : 'Try again.')
		} finally {
			setBusy(false)
		}
	}

	if (!open) {
		return (
			<Button variant="secondary" onPress={() => setOpen(true)}>
				<Button.Label>Add a status update</Button.Label>
			</Button>
		)
	}

	return (
		<Surface variant="secondary" className="gap-3 rounded-2xl p-4">
			<Typography.Paragraph className="font-medium">New status</Typography.Paragraph>
			<View className="flex-row flex-wrap gap-2">
				{caseStatuses.map((option) => (
					<Chip
						key={option}
						variant={status === option ? 'primary' : 'soft'}
						color="accent"
						onPress={() => setStatus(option)}
					>
						<Chip.Label>{caseStatusLabels[option]}</Chip.Label>
					</Chip>
				))}
			</View>
			<TextField>
				<Input
					value={note}
					onChangeText={setNote}
					placeholder="Add a note (optional)"
					multiline
					className="min-h-11"
				/>
			</TextField>
			<View className="flex-row gap-2">
				<Button variant="ghost" className="flex-1" isDisabled={busy} onPress={() => setOpen(false)}>
					<Button.Label>Cancel</Button.Label>
				</Button>
				<Button
					className="flex-[2]"
					isDisabled={busy || status === null}
					onPress={save}
				>
					<Button.Label>{busy ? 'Saving…' : 'Save update'}</Button.Label>
				</Button>
			</View>
		</Surface>
	)
}

/** Case detail (M3-T2): current status, timeline, official USCIS link, RFE
 * emphasis, and manual status updates. */
export function CaseDetailScreen({ caseId }: { caseId: Id<'cases'> }) {
	const detail = useCase(caseId)

	if (detail === undefined) return <ScreenLoading />
	if (detail === null) return <ScreenError title="Case not found" />

	const isRfe = detail.status === 'requestForEvidence'
	const timeline = [...detail.statusHistory].sort((a, b) => b.occurredAt - a.occurredAt)

	return (
		<BodyScrollView contentContainerClassName="gap-5 py-4">
			<View className="gap-2">
				<Typography.Heading className="text-2xl font-bold tabular-nums">
					{detail.receiptNumber}
				</Typography.Heading>
				<View className="flex-row">
					<Chip variant="soft" color={statusTone(detail.status) === 'positive' ? 'success' : statusTone(detail.status) === 'attention' ? 'warning' : 'default'}>
						<Chip.Label>{caseStatusLabels[detail.status]}</Chip.Label>
					</Chip>
				</View>
			</View>

			{isRfe ? (
				<Alert status="warning">
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>Request for Evidence</Alert.Title>
						<Alert.Description>
							USCIS needs more from you. Respond by the deadline printed on your RFE notice — a late
							or missed response can lead to a denial.
						</Alert.Description>
					</Alert.Content>
				</Alert>
			) : null}

			<Pressable
				accessibilityRole="link"
				onPress={() => void Linking.openURL(USCIS_CASE_STATUS_URL)}
			>
				<Surface variant="secondary" className="flex-row items-center gap-3 rounded-2xl p-4">
					<StyledLucideIcon name="external-link" size={20} className="text-accent" />
					<View className="flex-1">
						<Typography.Paragraph className="font-medium">
							Check the official status on USCIS
						</Typography.Paragraph>
						<Typography.Paragraph color="muted" className="text-sm">
							Enter this receipt number at egov.uscis.gov for the latest update.
						</Typography.Paragraph>
					</View>
				</Surface>
			</Pressable>

			<View className="gap-3">
				<Typography.Heading className="text-base font-semibold">Timeline</Typography.Heading>
				<View>
					{timeline.map((entry, index) => (
						<TimelineRow key={`${entry.status}-${entry.occurredAt}`} entry={entry} isLatest={index === 0} />
					))}
				</View>
				<Separator />
				<AddUpdate caseId={caseId} />
			</View>
		</BodyScrollView>
	)
}
