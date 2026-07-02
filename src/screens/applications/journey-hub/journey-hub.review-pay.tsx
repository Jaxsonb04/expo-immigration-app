import { SectionHeading } from '@/components/core'
import { Button, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { useInterviewDone, useJourneyHub } from './journey-hub.context'
import { comingSoon } from './journey-hub.utils'
import { formMetaFor, openDraftPreview } from './pdf/pdf.preview'

export function ReviewPay() {
	const { application, draft, isUnlocked } = useJourneyHub()
	const interviewDone = useInterviewDone()
	const [previewBusy, setPreviewBusy] = useState(false)
	const isDraft = application.status === 'draft'
	const meta = formMetaFor(application.formType)

	const handlePreview = async () => {
		if (!draft || previewBusy) return
		setPreviewBusy(true)
		try {
			// Branch on draft.formType so the answers union discriminates.
			if (draft.formType === 'i765') {
				await openDraftPreview({
					formType: 'i765',
					answers: draft.answers,
					applicationKind: application.applicationKind,
				})
			} else {
				await openDraftPreview({
					formType: 'i90',
					answers: draft.answers,
					applicationKind: application.applicationKind,
				})
			}
		} catch (error) {
			Alert.alert(
				'Could not build preview',
				error instanceof Error ? error.message : 'Something went wrong building the preview.',
			)
		} finally {
			setPreviewBusy(false)
		}
	}

	return (
		<View className="gap-2">
			<SectionHeading title="Review & Pay" />
			<Typography.Paragraph color="muted">
				{isUnlocked
					? 'Unlocked — download your filing package anytime, edits included.'
					: 'Preview your completed form for free. Pay once to download the print-ready filing package. The government filing fee is separate and paid to USCIS directly.'}
			</Typography.Paragraph>
			{isDraft && (
				<>
					<Button
						variant="secondary"
						isDisabled={!interviewDone || previewBusy}
						onPress={handlePreview}
					>
						<Button.Label>
							{previewBusy ? 'Preparing preview…' : 'Preview your form (free)'}
						</Button.Label>
					</Button>
					<Typography.Paragraph color="muted" type="body-sm">
						{`Official ${meta.title} · OMB ${meta.omb} (expires ${meta.ombExpires}). Watermarked — not for filing.`}
					</Typography.Paragraph>
					<Button
						variant="secondary"
						isDisabled={!interviewDone}
						onPress={() => comingSoon(isUnlocked ? 'Filing package' : 'Preview & pay')}
					>
						<Button.Label>{isUnlocked ? 'Get filing package' : 'Preview & pay'}</Button.Label>
					</Button>
				</>
			)}
		</View>
	)
}
