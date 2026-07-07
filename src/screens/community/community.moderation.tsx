import { BodyScrollView, ScreenEmpty, ScreenError, ScreenLoading } from '@/components/core'
import { Button, Chip, Separator, Surface, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import {
	REPORT_REASON_LABELS,
	formatRelativeTime,
	useIsModerator,
	useReports,
	useResolveReport,
	useSetModerationStatus,
	type ModerationReport,
} from './community.data'

// M4-T3 moderation queue: open reports, newest first, each showing the target
// in its PUBLIC projection (the server never sends owner ids, reporter ids, or
// emails — reporters stay anonymous even to moderators). Hide and Restore act
// on the target; Dismiss closes the report without touching the content.

function targetSummary(target: NonNullable<ModerationReport['target']>) {
	return target.kind === 'post'
		? { handle: target.post.authorHandle, title: target.post.title, body: target.post.body }
		: { handle: target.comment.authorHandle, title: null, body: target.comment.body }
}

function ReportCard({ report, now }: { report: ModerationReport; now: number }) {
	const setStatus = useSetModerationStatus()
	const resolveReport = useResolveReport()
	const [busy, setBusy] = useState(false)

	async function run(label: string, fn: () => Promise<unknown>) {
		setBusy(true)
		try {
			await fn()
		} catch (error) {
			Alert.alert(label, error instanceof Error ? error.message : 'Please try again.')
		} finally {
			setBusy(false)
		}
	}

	const target = report.target
	const isHidden = target?.moderationStatus === 'hidden'
	const isActionable = target !== null && target.moderationStatus !== 'removed'

	return (
		<Surface variant="secondary" className="gap-3 rounded-2xl p-4">
			<View className="flex-row items-center gap-2">
				<Chip variant="soft" color="warning" size="sm">
					<Chip.Label>{REPORT_REASON_LABELS[report.reason]}</Chip.Label>
				</Chip>
				<Chip variant="soft" color="default" size="sm">
					<Chip.Label>{report.targetType === 'post' ? 'Post' : 'Comment'}</Chip.Label>
				</Chip>
				<View className="flex-1" />
				<Typography.Paragraph color="muted" className="text-xs tabular-nums">
					{formatRelativeTime(report.createdAt, now)}
				</Typography.Paragraph>
			</View>

			{report.note !== undefined ? (
				<Typography.Paragraph color="muted" className="text-xs italic leading-relaxed">
					Reporter’s note: “{report.note}”
				</Typography.Paragraph>
			) : null}

			<Separator />

			{target === null ? (
				<Typography.Paragraph color="muted" className="text-sm">
					This content no longer exists (deleted with its author’s account).
				</Typography.Paragraph>
			) : (
				(() => {
					const summary = targetSummary(target)
					return (
						<View className="gap-1">
							<View className="flex-row items-center gap-2">
								<Typography.Paragraph className="text-xs font-medium">
									{summary.handle}
								</Typography.Paragraph>
								{target.moderationStatus !== 'visible' ? (
									<Chip variant="soft" color={isHidden ? 'danger' : 'default'} size="sm">
										<Chip.Label>{target.moderationStatus}</Chip.Label>
									</Chip>
								) : null}
							</View>
							{summary.title !== null ? (
								<Typography.Paragraph className="font-semibold leading-snug">
									{summary.title}
								</Typography.Paragraph>
							) : null}
							<Typography.Paragraph color="muted" numberOfLines={4} className="text-sm leading-relaxed">
								{summary.body}
							</Typography.Paragraph>
						</View>
					)
				})()
			)}

			<View className="flex-row gap-2">
				{isActionable ? (
					isHidden ? (
						<Button
							size="sm"
							variant="secondary"
							className="flex-1"
							isDisabled={busy}
							onPress={() =>
								run('Could not restore', () =>
									setStatus({
										targetType: report.targetType,
										targetKey: report.targetKey,
										status: 'visible',
									}),
								)
							}
						>
							<Button.Label>Restore</Button.Label>
						</Button>
					) : (
						<Button
							size="sm"
							variant="secondary"
							className="flex-1"
							isDisabled={busy}
							onPress={() =>
								run('Could not hide', () =>
									setStatus({
										targetType: report.targetType,
										targetKey: report.targetKey,
										status: 'hidden',
									}),
								)
							}
						>
							<Button.Label className="text-danger">Hide</Button.Label>
						</Button>
					)
				) : null}
				<Button
					size="sm"
					variant="ghost"
					className="flex-1"
					isDisabled={busy}
					onPress={() =>
						run('Could not dismiss', () =>
							resolveReport({
								reportId: report._id,
								resolution: isHidden ? 'resolved' : 'dismissed',
							}),
						)
					}
				>
					<Button.Label>{isHidden ? 'Resolve' : 'Dismiss'}</Button.Label>
				</Button>
			</View>
		</Surface>
	)
}

/**
 * Moderation queue (M4-T3). Reachable only from the moderator toolbar
 * affordance; the server independently rejects non-moderators, and the query is
 * skipped entirely for them here.
 */
export function CommunityModerationScreen() {
	const isModerator = useIsModerator()
	const { results, status, loadMore } = useReports(isModerator === true)
	const [now] = useState(() => Date.now())

	if (isModerator === undefined) return <ScreenLoading />
	if (!isModerator) return <ScreenError title="This area is for moderators" />
	if (status === 'LoadingFirstPage') return <ScreenLoading />

	if (results.length === 0) {
		return (
			<ScreenEmpty
				title="No open reports"
				description="When someone reports a post or comment it lands here for review."
			/>
		)
	}

	return (
		<BodyScrollView contentContainerClassName="gap-3 py-4">
			<Typography.Paragraph color="muted" className="px-1 text-center text-xs leading-relaxed">
				Reporters stay anonymous; authors appear only by their public handle.
			</Typography.Paragraph>
			{results.map((report) => (
				<ReportCard key={report._id} report={report} now={now} />
			))}
			{status === 'CanLoadMore' || status === 'LoadingMore' ? (
				<Button variant="ghost" isDisabled={status === 'LoadingMore'} onPress={() => loadMore(20)}>
					<Button.Label>{status === 'LoadingMore' ? 'Loading…' : 'Load more'}</Button.Label>
				</Button>
			) : null}
		</BodyScrollView>
	)
}
