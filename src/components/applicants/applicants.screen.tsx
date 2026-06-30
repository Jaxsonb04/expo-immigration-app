import { DocumentUpload, RecentDocuments } from '@/components/documents'
import { router } from 'expo-router'
import { Button, ListGroup, Spinner, Typography } from 'heroui-native'
import { ScrollView, View } from 'react-native'
import { ApplicantCard } from './applicants.card'
import { useApplicants } from './applicants.data'

/**
 * The Vault tab's Applicants surface: see the applicants (self + dependents)
 * whose saved details autofill future renewals, and start the add-applicant
 * Interview (→ /add-applicant). Wired to the Convex `applicants` functions.
 */
export function ApplicantsScreen() {
	const applicants = useApplicants()
	const self = applicants?.find((applicant) => applicant.relationship === 'self')

	return (
		<ScrollView
			className="flex-1 bg-background"
			keyboardShouldPersistTaps="handled"
			contentContainerClassName="gap-5 px-5 pb-2"
		>
			<Typography.Paragraph color="muted">
				People you file for. Their saved details autofill future renewals.
			</Typography.Paragraph>

			<View className="gap-3">
				{applicants === undefined ? (
					<View className="items-center py-8">
						<Spinner />
					</View>
				) : applicants.length === 0 ? (
					<View className="items-center gap-3 py-8">
						<Typography.Paragraph color="muted" className="text-center">
							No applicants yet. Add yourself to get started.
						</Typography.Paragraph>
						<Button onPress={() => router.push('/add-applicant')}>
							<Button.Label>Add yourself</Button.Label>
						</Button>
					</View>
				) : (
					<>
						<ListGroup>
							{applicants.map((applicant) => (
								<ApplicantCard key={applicant._id} applicant={applicant} />
							))}
						</ListGroup>
						<Button variant="ghost" onPress={() => router.push('/add-applicant')}>
							<Button.Label>Add another applicant</Button.Label>
						</Button>
					</>
				)}
			</View>

			{self ? (
				<View className="gap-5">
					<DocumentUpload applicantId={self._id} />
					<RecentDocuments />
				</View>
			) : null}
		</ScrollView>
	)
}
