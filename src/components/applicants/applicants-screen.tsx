import { Card, ListGroup, Spinner, Typography } from 'heroui-native'
import type { JSX } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AddApplicantForm } from './add-applicant-form'
import { ApplicantCard } from './applicant-card'
import { useApplicants } from './applicants.data'

/**
 * The Applicants tab: add applicants (self + dependents) and see the ones whose
 * saved details will autofill future renewals. Wired to the Convex
 * `applicants` functions.
 */
export function ApplicantsScreen(): JSX.Element {
	const applicants = useApplicants()
	const insets = useSafeAreaInsets()

	return (
		<ScrollView
			className="flex-1 bg-background"
			keyboardShouldPersistTaps="handled"
			contentContainerClassName="gap-5 px-5 pb-2"
		>
			<Typography.Paragraph color="muted">
				People you file for. Their saved details autofill future renewals.
			</Typography.Paragraph>

			<Card className="gap-4 p-5">
				<Typography.Paragraph className="font-semibold">Add an applicant</Typography.Paragraph>
				<AddApplicantForm />
			</Card>

			<View className="gap-3">
				{applicants === undefined ? (
					<View className="items-center py-8">
						<Spinner />
					</View>
				) : applicants.length === 0 ? (
					<Typography.Paragraph color="muted" className="py-8 text-center">
						No applicants yet. Add yourself to get started.
					</Typography.Paragraph>
				) : (
					<ListGroup>
						{applicants.map((applicant) => (
							<ApplicantCard key={applicant._id} applicant={applicant} />
						))}
					</ListGroup>
				)}
			</View>
		</ScrollView>
	)
}
