import { BodyScrollView } from '@/components/core/body-scroll-view'
import { Button, Card, Spinner, Typography } from 'heroui-native'
import { useState } from 'react'
import { View } from 'react-native'
import { Case } from './case'
import { useCases } from './cases.data'

/**
 * The Filings tab body: track submitted filings as Cases. Enter a USCIS Receipt
 * Number (ADR-0008, manual entry), then see each case's current status against
 * the canonical status enum plus its history timeline. The receipt-entry form is
 * revealed via a CTA so it stays out of the way once cases exist.
 */
export function CasesScreen() {
	const cases = useCases()
	const [showForm, setShowForm] = useState(false)

	return (
		<BodyScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5">
			<Typography.Paragraph color="muted">
				Track a submitted filing by its USCIS Receipt Number and follow its status.
			</Typography.Paragraph>

			{cases === undefined ? (
				<View className="items-center py-8">
					<Spinner />
				</View>
			) : cases.length === 0 ? (
				showForm ? (
					<Card className="gap-4 p-5">
						<Typography.Paragraph className="font-semibold">
							Enter receipt number
						</Typography.Paragraph>
						<Case.AddForm onAdded={() => setShowForm(false)} />
					</Card>
				) : (
					<Card className="items-center gap-3 p-6">
						<Typography.Paragraph color="muted" className="text-center">
							No cases yet. Add a case to track its USCIS status and history.
						</Typography.Paragraph>
						<Button onPress={() => setShowForm(true)}>
							<Button.Label>Enter receipt number</Button.Label>
						</Button>
					</Card>
				)
			) : (
				<View className="gap-5">
					{showForm ? (
						<Card className="gap-4 p-5">
							<Typography.Paragraph className="font-semibold">Add a case</Typography.Paragraph>
							<Case.AddForm onAdded={() => setShowForm(false)} />
						</Card>
					) : (
						<Button variant="ghost" onPress={() => setShowForm(true)}>
							<Button.Label>Add a case</Button.Label>
						</Button>
					)}
					{cases.map((theCase) => (
						<Case.Card key={theCase._id} case={theCase} />
					))}
				</View>
			)}
		</BodyScrollView>
	)
}
