import { StyledLucideIcon } from '@/components/styled-icon'
import type { FormType } from '@convex/shared/applicationShapes'
import type { ReviewGroup as ReviewGroupData } from '@convex/shared/reviewModel'
import { stepDescriptorsFor } from '@/screens/interview/interview.form'
import { Chip, Surface, Typography } from 'heroui-native'
import { Pressable, View } from 'react-native'
import { blockerMessage } from './review.labels'
import { ReviewRow } from './review.row'

/** The step question, keyed by step, reused from the interview blueprint so the
 * review section titles read exactly like the questions the user answered. */
function questionFor(formType: FormType, stepKey: string): string {
	return stepDescriptorsFor(formType).find((step) => step.key === stepKey)?.question ?? stepKey
}

/**
 * One interview step rendered as a review card: its question as the title, a
 * complete / needs-attention chip (plus a blocker sentence when a set answer
 * cannot be filed), the applicable answer rows, an Edit affordance that jumps
 * to exactly this step, and a once-per-group provenance caption when the group
 * owns promotable profile facts.
 */
export function ReviewGroup({
	formType,
	group,
	onEdit,
}: {
	formType: FormType
	group: ReviewGroupData
	onEdit: () => void
}) {
	const question = questionFor(formType, group.stepKey)
	const hasProfileFacts = group.rows.some((row) => row.namespace === 'personFacts')

	return (
		<Surface variant="secondary" className="gap-control rounded-2xl p-card">
			<View className="flex-row items-start gap-control">
				<View className="flex-1 gap-hairline">
					<Typography.Heading className="text-base font-semibold leading-6">
						{question}
					</Typography.Heading>
					<View className="flex-row items-center gap-tight">
						<StyledLucideIcon
							name={group.complete ? 'circle-check' : 'circle-alert'}
							size={16}
							className={group.complete ? 'text-success' : 'text-warning'}
						/>
						<Chip size="sm" variant="soft">
							<Chip.Label>{group.complete ? 'Complete' : 'Needs attention'}</Chip.Label>
						</Chip>
					</View>
				</View>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`Edit: ${question}`}
					hitSlop={8}
					onPress={onEdit}
					className="flex-row items-center gap-hairline pt-hairline"
				>
					<Typography.Paragraph className="text-sm text-accent">Edit</Typography.Paragraph>
					<StyledLucideIcon name="chevron-right" size={16} className="text-accent" />
				</Pressable>
			</View>

			{group.blocker !== undefined && (
				<Typography.Paragraph color="muted" className="text-sm leading-relaxed">
					{blockerMessage(group.blocker)}
				</Typography.Paragraph>
			)}

			<View className="gap-hairline">
				{group.rows.map((row) => (
					<ReviewRow key={row.key} formType={formType} row={row} />
				))}
			</View>

			{hasProfileFacts && (
				<Typography.Paragraph color="muted" className="text-xs">
					Also saved to this applicant&apos;s reusable profile.
				</Typography.Paragraph>
			)}
		</Surface>
	)
}
