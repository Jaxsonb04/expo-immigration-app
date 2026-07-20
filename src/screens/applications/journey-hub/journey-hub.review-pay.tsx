import { useRequireAccount } from '@/components/account'
import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { requirementLabel } from '@/lib/application-labels'
import { FEE_DISCLAIMER, FILING_FEE_AS_OF, OFFICIAL_LINKS, filingInfoFor } from '@/lib/filing-info'
import { stepDescriptorsFor } from '@/screens/interview/interview.form'
import { Button, Surface, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, Linking, Pressable, View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'
import type { RenderDraftArgs } from './pdf/pdf.render'
import { formMetaFor, openDraftPreview, openFilingPackage } from './pdf/pdf.preview'

/** A muted, tappable official uscis.gov link. */
function OfficialLink({ label, url }: { label: string; url: string }) {
	return (
		<Pressable accessibilityRole="link" onPress={() => void Linking.openURL(url)}>
			<Typography.Paragraph className="text-sm text-accent underline">{label}</Typography.Paragraph>
		</Pressable>
	)
}

/** The USCIS government filing fee, shown for information only. The app itself
 * charges nothing — this fee goes to the U.S. government, never to this app. */
function UscisFeeInfo({ formType }: { formType: RenderDraftArgs['formType'] }) {
	const info = filingInfoFor(formType)
	return (
		<Surface variant="secondary" className="gap-control rounded-2xl p-card">
			<View className="gap-hairline">
				<Typography.Paragraph className="font-medium">
					USCIS government filing fee
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-xs">
					Paid directly to USCIS (the U.S. government), never to this app.
				</Typography.Paragraph>
				<Typography.Paragraph className="text-sm leading-relaxed">
					{info.usciFeeSummary}
				</Typography.Paragraph>
				<OfficialLink label="Check your exact fee →" url={OFFICIAL_LINKS.feeCalculator} />
			</View>

			<Typography.Paragraph color="muted" className="text-xs leading-relaxed">
				{FEE_DISCLAIMER} ({FILING_FEE_AS_OF}.)
			</Typography.Paragraph>
		</Surface>
	)
}

function FilingInstructions({ formType }: { formType: RenderDraftArgs['formType'] }) {
	const info = filingInfoFor(formType)
	return (
		<View className="gap-tight">
			<Typography.Heading className="text-base font-semibold">How to file</Typography.Heading>
			<Typography.Paragraph className="text-sm leading-relaxed">
				{info.filingInstructions}
			</Typography.Paragraph>
			<Typography.Paragraph color="muted" className="text-sm leading-relaxed">
				Use the current form edition, sign and date it (an unsigned form is rejected), and include
				the correct fee. Confirm all details on uscis.gov before submitting.
			</Typography.Paragraph>
			<View className="flex-row flex-wrap gap-card">
				<OfficialLink label="Filing address →" url={info.addressLink} />
				<OfficialLink label="Fee waiver (I-912) →" url={OFFICIAL_LINKS.feeWaiver} />
			</View>
		</View>
	)
}

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

/**
 * The server-computed readiness blockers (convex/shared/readiness.ts), grouped
 * by what the user can do about them. The coverage group is the honesty
 * notice: while the app cannot produce a complete edition of the form, it says
 * so here instead of exporting something that merely looks fileable.
 */
function ReadinessBlockers() {
	const { application, readiness } = useJourneyHub()
	const meta = formMetaFor(application.formType)
	const stepQuestions = new Map(
		stepDescriptorsFor(application.formType).map((step) => [step.key, step.question]),
	)
	const answerItems = readiness.blockers.flatMap((blocker) =>
		blocker.kind === 'answers'
			? [{ key: blocker.stepKey, label: stepQuestions.get(blocker.stepKey) ?? blocker.stepKey }]
			: [],
	)
	const documentItems = readiness.blockers.flatMap((blocker) =>
		blocker.kind === 'document'
			? [{ key: blocker.requirementKey, label: requirementLabel(blocker.requirementKey) }]
			: [],
	)
	const coverageItems = readiness.blockers.flatMap((blocker, index) =>
		blocker.kind === 'coverage' ? [{ key: `coverage-${index}`, label: blocker.item }] : [],
	)
	if (readiness.isReadyToFile) return null

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
					<OfficialLink
						label="See the full official form →"
						url={application.formType === 'i765' ? OFFICIAL_LINKS.i765 : OFFICIAL_LINKS.i90}
					/>
				</View>
			)}
		</Surface>
	)
}

export function ReviewPay() {
	const { application, draft, readiness } = useJourneyHub()
	const requireAccount = useRequireAccount()
	const [previewBusy, setPreviewBusy] = useState(false)
	const [packageBusy, setPackageBusy] = useState(false)
	const isDraft = application.status === 'draft'
	const meta = formMetaFor(application.formType)

	async function runExport(
		open: (args: RenderDraftArgs) => Promise<void>,
		setBusy: (value: boolean) => void,
		failureTitle: string,
	) {
		if (!draft || previewBusy || packageBusy) return
		setBusy(true)
		try {
			// Branch on draft.formType so the answers union discriminates.
			if (draft.formType === 'i765') {
				await open({
					formType: 'i765',
					answers: draft.answers,
					applicationKind: application.applicationKind,
				})
			} else {
				await open({
					formType: 'i90',
					answers: draft.answers,
					applicationKind: application.applicationKind,
				})
			}
		} catch (error) {
			Alert.alert(failureTitle, error instanceof Error ? error.message : 'Something went wrong.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<View className="gap-control">
			<SectionHeading title="Review & File" />
			<Typography.Paragraph color="muted">
				Preview a watermarked draft once your answers are complete. The clean export unlocks only
				when everything the official form requires is covered. The USCIS filing fee is separate
				and paid to USCIS directly, never to this app.
			</Typography.Paragraph>

			{isDraft && (
				<>
					<ReadinessBlockers />

					<Button
						variant="secondary"
						isDisabled={!readiness.answersComplete || previewBusy || packageBusy}
						onPress={() => runExport(openDraftPreview, setPreviewBusy, 'Could not build preview')}
					>
						<Button.Label>{previewBusy ? 'Preparing preview…' : 'Preview your form'}</Button.Label>
					</Button>
					<Typography.Paragraph color="muted" type="body-sm">
						{`Official ${meta.title} · OMB ${meta.omb} (expires ${meta.ombExpires}). Watermarked — not for filing.`}
					</Typography.Paragraph>

					<UscisFeeInfo formType={application.formType} />
					<FilingInstructions formType={application.formType} />

					<Button
						isDisabled={!readiness.isReadyToFile || packageBusy || previewBusy}
						onPress={async () => {
							// M6-T3 conversion gate: exporting the filing is the moment a
							// temporary session must become a real account. The upgrade
							// carries every answer, document, and case over (Better Auth
							// anonymous linking → convex/auth.ts onLinkAccount), and the
							// export resumes right here on success.
							const ok = await requireAccount({
								title: 'Create an account to export your filing',
								description:
									'Create an account or continue with Google to export your filing. Everything you’ve entered comes with you.',
							})
							if (!ok) return
							await runExport(openFilingPackage, setPackageBusy, 'Could not build filing package')
						}}
					>
						<Button.Label>
							{packageBusy ? 'Preparing package…' : 'Export filing package (clean PDF)'}
						</Button.Label>
					</Button>
					{!readiness.isReadyToFile && (
						<Typography.Paragraph color="muted" type="body-sm">
							{`Locked — this version can't yet produce a complete ${meta.title}. The items under "Before this can be filed" explain what's missing.`}
						</Typography.Paragraph>
					)}
				</>
			)}
		</View>
	)
}
