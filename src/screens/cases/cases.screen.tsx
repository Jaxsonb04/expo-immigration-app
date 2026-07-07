import { BodyScrollView, ScreenEmpty, ScreenLoading } from '@/components/core'
import { caseStatusLabels } from '@/lib/application-labels'
import { router } from 'expo-router'
import { Chip, Surface, Typography } from 'heroui-native'
import { Pressable, View } from 'react-native'
import { formatCaseDate, statusTone, useCases, type CaseSummary } from './cases.data'

const TONE_COLOR = {
	attention: 'warning',
	positive: 'success',
	neutral: 'default',
} as const

function StatusChip({ status }: { status: CaseSummary['status'] }) {
	return (
		<Chip variant="soft" color={TONE_COLOR[statusTone(status)]} size="sm">
			<Chip.Label>{caseStatusLabels[status]}</Chip.Label>
		</Chip>
	)
}

function CaseRow({ item }: { item: CaseSummary }) {
	return (
		<Pressable accessibilityRole="button" onPress={() => router.push(`/cases/${item._id}`)}>
			<Surface variant="secondary" className="gap-2 rounded-2xl p-4">
				<View className="flex-row items-center justify-between gap-3">
					<Typography.Paragraph className="font-semibold tabular-nums">
						{item.receiptNumber}
					</Typography.Paragraph>
					<StatusChip status={item.status} />
				</View>
				<Typography.Paragraph color="muted" className="text-xs">
					Updated {formatCaseDate(item.updatedAt)}
				</Typography.Paragraph>
			</Surface>
		</Pressable>
	)
}

/**
 * Cases tab (M3-T2): receipt-number tracking with status timelines. Reads the
 * owner's cases (M3-T1 backend); tapping a card opens its detail + timeline.
 */
export function CasesScreen() {
	const cases = useCases()

	if (cases === undefined) return <ScreenLoading />

	if (cases.length === 0) {
		return (
			<ScreenEmpty
				title="No cases to track yet"
				description="Once you’ve filed with USCIS, add your receipt number here to follow each case’s status and timeline."
				action={{ label: 'Add a case', onPress: () => router.push('/new-case') }}
			/>
		)
	}

	return (
		<BodyScrollView contentContainerClassName="gap-3 py-4">
			{cases.map((item) => (
				<CaseRow key={item._id} item={item} />
			))}
		</BodyScrollView>
	)
}
