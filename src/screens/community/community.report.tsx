import { useRequireAccount } from '@/components/account'
import { StyledLucideIcon } from '@/components/styled-icon'
import { reportReasons, type ReportReason } from '@convex/shared/community'
import { Button, Chip, Surface, TextArea, TextField, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { REPORT_REASON_LABELS, useReportContent } from './community.data'

type ReportTarget = { type: 'post' | 'comment'; id: string }

/**
 * A compact, subordinate "Report" affordance that expands into a reason picker
 * (M4-T2). Reporting is a gated write: submitting first awaits the account gate
 * (anonymous → upgrade sheet), then calls the server, which re-enforces
 * credentials and one-report-per-target.
 */
export function ReportAction({ target }: { target: ReportTarget }) {
	const requireAccount = useRequireAccount()
	const reportContent = useReportContent()
	const [open, setOpen] = useState(false)
	const [reason, setReason] = useState<ReportReason | null>(null)
	const [note, setNote] = useState('')
	const [busy, setBusy] = useState(false)
	const [done, setDone] = useState(false)

	async function submit() {
		if (reason === null) return
		const ok = await requireAccount({
			title: 'Create a free account to report',
			description: 'Reporting helps keep the community safe and respectful.',
		})
		if (!ok) return
		setBusy(true)
		try {
			await reportContent({
				targetType: target.type,
				targetId: target.id,
				reason,
				note: note.trim() || undefined,
			})
			setOpen(false)
			setDone(true)
		} catch (error) {
			Alert.alert('Could not report', error instanceof Error ? error.message : 'Please try again.')
		} finally {
			setBusy(false)
		}
	}

	if (done) {
		return (
			<View className="flex-row items-center gap-1.5">
				<StyledLucideIcon name="check" size={13} className="text-success" />
				<Typography.Paragraph color="muted" className="text-xs">
					Reported — thank you
				</Typography.Paragraph>
			</View>
		)
	}

	if (!open) {
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Report this content"
				className="flex-row items-center gap-1.5"
				onPress={() => setOpen(true)}
			>
				<StyledLucideIcon name="flag" size={13} className="text-muted" />
				<Typography.Paragraph color="muted" className="text-xs font-medium">
					Report
				</Typography.Paragraph>
			</Pressable>
		)
	}

	return (
		<Surface variant="secondary" className="gap-3 rounded-2xl p-4">
			<Typography.Paragraph className="font-medium">Why are you reporting this?</Typography.Paragraph>
			<View className="flex-row flex-wrap gap-2">
				{reportReasons.map((option) => (
					<Chip
						key={option}
						variant={reason === option ? 'primary' : 'soft'}
						color="accent"
						onPress={() => setReason(option)}
					>
						<Chip.Label>{REPORT_REASON_LABELS[option]}</Chip.Label>
					</Chip>
				))}
			</View>
			<TextField>
				<TextArea
					value={note}
					onChangeText={setNote}
					placeholder="Add any details (optional)"
					variant="secondary"
				/>
			</TextField>
			<View className="flex-row gap-2">
				<Button variant="ghost" className="flex-1" isDisabled={busy} onPress={() => setOpen(false)}>
					<Button.Label>Cancel</Button.Label>
				</Button>
				<Button className="flex-[2]" isDisabled={busy || reason === null} onPress={submit}>
					<Button.Label>{busy ? 'Reporting…' : 'Submit report'}</Button.Label>
				</Button>
			</View>
		</Surface>
	)
}
