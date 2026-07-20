import { StyledLucideIcon } from '@/components/styled-icon'
import { requirementLabel } from '@/lib/application-labels'
import { OFFICIAL_LINKS } from '@/lib/filing-info'
import { stepDescriptorsFor } from '@/screens/interview/interview.form'
import type { FormType } from '@convex/shared/applicationShapes'
import type { ApplicationReadiness } from '@convex/shared/readiness'
import { Surface, Typography } from 'heroui-native'
import { Linking, Pressable, View } from 'react-native'
import { formMetaFor } from './pdf/pdf.preview'

// The server-computed readiness blockers (convex/shared/readiness.ts), rendered
// as an honest "before this can be filed" notice. Prop-driven so both the
// Journey Hub export surface (all families) and the review screen (documents +
// coverage only — answers are already shown per group there) share one renderer.

type BlockerFamily = 'answers' | 'document' | 'coverage'
type BlockerItem = { key: string; label: string }

function BlockerList({ title, items }: { title: string; items: BlockerItem[] }) {
	return (
		<View className="gap-hairline">
			<Typography.Paragraph className="text-sm font-medium">{title}</Typography.Paragraph>
			{items.map((item) => (
				<View key={item.key} className="flex-row items-start gap-tight">
					<StyledLucideIcon name="circle-alert" size={14} className="mt-hairline text-warning" />
					<Typography.Paragraph color="muted" className="flex-1 text-sm leading-relaxed">
						{item.label}
					</Typography.Paragraph>
				</View>
			))}
		</View>
	)
}

export function ReadinessBlockers({
	formType,
	readiness,
	families = ['answers', 'document', 'coverage'],
}: {
	formType: FormType
	readiness: ApplicationReadiness
	families?: readonly BlockerFamily[]
}) {
	if (readiness.isReadyToFile) return null
	const show = (family: BlockerFamily) => families.includes(family)
	const meta = formMetaFor(formType)
	const stepQuestions = new Map(
		stepDescriptorsFor(formType).map((step) => [step.key, step.question]),
	)
	const answerItems = show('answers')
		? readiness.blockers.flatMap((blocker) =>
				blocker.kind === 'answers'
					? [{ key: blocker.stepKey, label: stepQuestions.get(blocker.stepKey) ?? blocker.stepKey }]
					: [],
			)
		: []
	const documentItems = show('document')
		? readiness.blockers.flatMap((blocker) =>
				blocker.kind === 'document'
					? [{ key: blocker.requirementKey, label: requirementLabel(blocker.requirementKey) }]
					: [],
			)
		: []
	const coverageItems = show('coverage')
		? readiness.blockers.flatMap((blocker, index) =>
				blocker.kind === 'coverage' ? [{ key: `coverage-${index}`, label: blocker.item }] : [],
			)
		: []

	if (answerItems.length === 0 && documentItems.length === 0 && coverageItems.length === 0) {
		return null
	}

	return (
		<Surface variant="secondary" className="gap-control rounded-2xl p-card">
			<Typography.Paragraph className="font-medium">Before this can be filed</Typography.Paragraph>
			{answerItems.length > 0 && <BlockerList title="Finish your answers" items={answerItems} />}
			{documentItems.length > 0 && (
				<BlockerList title="Add the required documents" items={documentItems} />
			)}
			{coverageItems.length > 0 && (
				<View className="gap-hairline">
					<Typography.Paragraph className="text-sm font-medium">
						Not yet covered by this app
					</Typography.Paragraph>
					<Typography.Paragraph color="muted" className="text-xs leading-relaxed">
						{`${meta.title} also requires items this version of the app doesn't collect yet, so it can't produce a complete, fileable form:`}
					</Typography.Paragraph>
					{coverageItems.map((item) => (
						<View key={item.key} className="flex-row items-start gap-tight">
							<StyledLucideIcon name="circle-minus" size={14} className="mt-hairline text-muted" />
							<Typography.Paragraph color="muted" className="flex-1 text-sm leading-relaxed">
								{item.label}
							</Typography.Paragraph>
						</View>
					))}
					<Pressable
						accessibilityRole="link"
						onPress={() =>
							void Linking.openURL(formType === 'i765' ? OFFICIAL_LINKS.i765 : OFFICIAL_LINKS.i90)
						}
					>
						<Typography.Paragraph className="text-sm text-accent underline">
							See the full official form →
						</Typography.Paragraph>
					</Pressable>
				</View>
			)}
		</Surface>
	)
}
