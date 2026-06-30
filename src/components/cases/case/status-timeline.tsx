import { Typography } from 'heroui-native'
import { View } from 'react-native'
import type { CaseHistoryEntry } from '../cases.data'

/** Format an ISO 'YYYY-MM-DD' string for display; falls back to the raw value. */
function formatDate(iso: string): string {
	const parsed = new Date(`${iso}T00:00:00`)
	return Number.isNaN(parsed.getTime())
		? iso
		: parsed.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/**
 * A vertical status-history timeline (most recent first). The latest entry — the
 * case's current stage — is highlighted with an accent dot and bold label.
 */
export function CaseStatusTimeline({ history }: { history: readonly CaseHistoryEntry[] }) {
	if (history.length === 0) {
		return (
			<Typography.Paragraph color="muted" className="text-sm">
				No status history yet.
			</Typography.Paragraph>
		)
	}

	// Stored oldest-first (statuses are appended); show newest-first.
	const entries = [...history].reverse()

	return (
		<View>
			{entries.map((entry, index) => {
				const isLatest = index === 0
				const isLast = index === entries.length - 1
				return (
					<View key={`${entry.status}-${entry.date}-${index}`} className="flex-row gap-3">
						<View className="items-center">
							<View
								className={`mt-1 h-3 w-3 rounded-full ${isLatest ? 'bg-accent' : 'bg-border'}`}
							/>
							{isLast ? null : <View className="w-px flex-1 bg-border" />}
						</View>
						<View className={`flex-1 ${isLast ? '' : 'pb-4'}`}>
							<Typography.Paragraph className={isLatest ? 'font-semibold' : ''}>
								{entry.status}
							</Typography.Paragraph>
							<Typography.Paragraph color="muted" className="text-sm">
								{formatDate(entry.date)}
							</Typography.Paragraph>
						</View>
					</View>
				)
			})}
		</View>
	)
}
