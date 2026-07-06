import { SectionHeading } from '@/components/core'
import { progressLabel, situationLabel } from '@/lib/application-labels'
import { useRouter } from 'expo-router'
import { Card as HeroCard, Chip, Typography } from 'heroui-native'
import { Pressable, ScrollView, View } from 'react-native'
import { useDashboard } from './home.context'
import type { ActiveApplication } from './home.data'

function Heading() {
	const { activeApplications } = useDashboard()
	return <SectionHeading title="Active applications" count={activeApplications.length} />
}

function Card(props: { application: ActiveApplication }) {
	const router = useRouter()
	const { application } = props
	const label = situationLabel(application.formType, application.applicationKind)
	return (
		<Pressable
			accessibilityRole="button"
			onPress={() => router.push(`/forms/application/${application._id}`)}
		>
			<HeroCard className="w-64">
				<HeroCard.Body className="gap-1">
					<HeroCard.Title>{label.primary}</HeroCard.Title>
					<HeroCard.Description>{application.applicantName}</HeroCard.Description>
					<View className="flex-row items-center gap-2 pt-1">
						<Chip size="sm" variant="soft">
							<Chip.Label>{progressLabel(application)}</Chip.Label>
						</Chip>
						<Typography.Paragraph color="muted" className="text-xs">
							{application.completedStepCount}/{application.totalStepCount}
						</Typography.Paragraph>
					</View>
				</HeroCard.Body>
			</HeroCard>
		</Pressable>
	)
}

/**
 * Horizontal card rail. Breaks out of the screen's horizontal padding
 * (-mx-5) so cards can bleed to the edge while staying aligned at rest.
 */
function Rail() {
	const { activeApplications } = useDashboard()
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className="-mx-5"
			contentContainerClassName="gap-3 px-5 pb-5"
		>
			{activeApplications.map((application) => (
				<Card key={application._id} application={application} />
			))}
		</ScrollView>
	)
}

export const ActiveApplications = {
	Heading,
	Rail,
	Card,
}
