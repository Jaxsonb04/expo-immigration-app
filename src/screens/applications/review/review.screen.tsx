import { BodyScrollView } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { requirementLabel, situationLabel } from '@/lib/application-labels'
import { useApplicationDetail } from '@/screens/applications/journey-hub/journey-hub.data'
import { ReadinessBlockers } from '@/screens/applications/journey-hub/journey-hub.blockers'
import { formMetaFor, openDraftInApp } from '@/screens/applications/journey-hub/pdf/pdf.preview'
import type { RenderDraftArgs } from '@/screens/applications/journey-hub/pdf/pdf.render'
import type { Id } from '@convex/_generated/dataModel'
import { buildReviewModel } from '@convex/shared/reviewModel'
import { useRouter } from 'expo-router'
import { Button, Spinner, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated'
import { ReviewGroup } from './review.group'

// Staggered enter that collapses to an instant appearance under Reduce Motion
// (transform + opacity only), matching welcome.tsx.
const rise = (order: number) =>
	FadeInDown.duration(300)
		.delay(60 + order * 60)
		.reduceMotion(ReduceMotion.System)

/** The documents checklist: required slots joined with their attachment state. */
function ReviewDocuments({
	documentKeys,
	requirements,
}: {
	documentKeys: string[]
	requirements: { requirementKey: string; status: string }[]
}) {
	if (documentKeys.length === 0) return null
	return (
		<View className="gap-tight">
			<Typography.Heading className="text-base font-semibold">Documents</Typography.Heading>
			{documentKeys.map((key) => {
				const slot = requirements.find((r) => r.requirementKey === key)
				const resolved = slot?.status === 'attached' || slot?.status === 'waived'
				return (
					<View key={key} className="flex-row items-center gap-tight">
						<StyledLucideIcon
							name={resolved ? 'circle-check' : 'circle-alert'}
							size={16}
							className={resolved ? 'text-success' : 'text-warning'}
						/>
						<Typography.Paragraph className="flex-1 text-sm">
							{requirementLabel(key)}
						</Typography.Paragraph>
						{!resolved && (
							<Typography.Paragraph color="muted" className="text-sm">
								Needed
							</Typography.Paragraph>
						)}
					</View>
				)
			})}
		</View>
	)
}

export function ReviewScreen({ applicationId }: { applicationId: Id<'applications'> }) {
	const router = useRouter()
	const detail = useApplicationDetail(applicationId)
	const [previewBusy, setPreviewBusy] = useState(false)

	if (detail === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		)
	}

	const { application, applicant, draft, readiness, requirements } = detail

	if (application.status !== 'draft') {
		return (
			<View className="flex-1 items-center justify-center gap-card bg-background px-gutter">
				<Typography.Paragraph color="muted" className="text-center">
					This application has been filed — its answers can no longer be edited.
				</Typography.Paragraph>
				<Button variant="secondary" onPress={() => router.back()}>
					<Button.Label>Close</Button.Label>
				</Button>
			</View>
		)
	}

	const label = situationLabel(draft.formType, application.applicationKind)
	const meta = formMetaFor(draft.formType)
	const applicantName = applicant?.displayName ?? 'your'
	const model = buildReviewModel(draft.formType, application.applicationKind, draft.answers)

	// Jump the interview to exactly this step and return here after the save.
	function editStep(stepKey: string) {
		router.push(`/interview/${applicationId}?stepKey=${stepKey}&mode=single`)
	}

	async function previewDraft() {
		if (previewBusy || !draft) return
		setPreviewBusy(true)
		try {
			const args: RenderDraftArgs =
				draft.formType === 'i765'
					? {
							formType: 'i765',
							answers: draft.answers,
							applicationKind: application.applicationKind,
						}
					: {
							formType: 'i90',
							answers: draft.answers,
							applicationKind: application.applicationKind,
						}
			await openDraftInApp(args)
		} catch (error) {
			Alert.alert(
				'Could not open the draft',
				error instanceof Error ? error.message : 'Something went wrong.',
			)
		} finally {
			setPreviewBusy(false)
		}
	}

	return (
		<BodyScrollView contentContainerClassName="gap-section px-gutter py-card">
			<Animated.View entering={rise(0)} className="gap-hairline">
				<Typography.Heading className="text-2xl font-semibold">
					Review your answers
				</Typography.Heading>
				<Typography.Paragraph color="muted" className="text-sm">
					{`${label.primary} · for ${applicantName}`}
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-xs">
					{`Official ${meta.title} · OMB ${meta.omb} (expires ${meta.ombExpires}).`}
				</Typography.Paragraph>
			</Animated.View>

			{model.groups.map((group, index) => (
				<Animated.View key={group.stepKey} entering={rise(index + 1)}>
					<ReviewGroup
						formType={draft.formType}
						group={group}
						onEdit={() => editStep(group.stepKey)}
					/>
				</Animated.View>
			))}

			<Animated.View entering={rise(model.groups.length + 1)} className="gap-section">
				<ReviewDocuments documentKeys={model.documentKeys} requirements={requirements} />
				{/* The documents checklist above already shows per-document needed/
				    attached state, so the blockers notice here carries only the
				    form-wide coverage (honesty) items — no double-listing. */}
				<ReadinessBlockers
					formType={draft.formType}
					readiness={readiness}
					families={['coverage']}
				/>

				<View className="gap-control">
					<Button
						variant="secondary"
						isDisabled={!readiness.answersComplete || previewBusy}
						onPress={() => void previewDraft()}
					>
						<Button.Label>{previewBusy ? 'Opening…' : 'View draft PDF'}</Button.Label>
					</Button>
					<Typography.Paragraph color="muted" className="text-xs">
						A watermarked draft for checking — not for filing. Answer every question first.
					</Typography.Paragraph>
					<Button onPress={() => router.back()}>
						<Button.Label>Back to filing</Button.Label>
					</Button>
				</View>
			</Animated.View>
		</BodyScrollView>
	)
}
