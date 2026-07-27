import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { documentTypeLabel, requirementLabel } from '@/lib/application-labels'
import { isDocumentCompatible } from '@convex/shared/documentCompatibility'
import { evidenceRequirementFor } from '@convex/shared/evidenceRequirements'
import { useRouter } from 'expo-router'
import { Button, Spinner, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, Pressable, View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'
import { useDocumentActions } from './journey-hub.documents.data'

/** Past its expiry date. Expired ≠ unusable — an I-765 renewal attaches the
 * very card that's expiring — so this only drives an honest tag, not a block. */
function isExpired(expiryDate: string | undefined): boolean {
	if (!expiryDate) return false
	return new Date(`${expiryDate}T23:59:59`).getTime() < Date.now()
}

type Requirement = ReturnType<typeof useJourneyHub>['requirements'][number]
type ApplicantDocument = ReturnType<typeof useJourneyHub>['applicantDocuments'][number]

function StatusIcon({ satisfied }: { satisfied: boolean }) {
	if (satisfied) return <StyledLucideIcon name="circle-check" size={20} className="text-success" />
	return <StyledLucideIcon name="circle-alert" size={20} className="text-warning" />
}

/** The reusable Vault documents an owner can attach without re-uploading. */
function ReuseList(props: {
	documents: ApplicantDocument[]
	onPick: (documentId: ApplicantDocument['_id']) => void
}) {
	if (props.documents.length === 0) return null
	return (
		<View className="mt-hairline gap-hairline rounded-xl bg-surface-secondary p-tight">
			<Typography.Paragraph color="muted" className="px-hairline text-xs">
				Use a saved document
			</Typography.Paragraph>
			{props.documents.map((doc) => (
				<Pressable
					key={doc._id}
					accessibilityRole="button"
					onPress={() => props.onPick(doc._id)}
					className="flex-row items-center gap-tight rounded-lg px-tight py-tight"
				>
					<StyledLucideIcon name="file" size={16} className="text-muted" />
					<Typography.Paragraph className="flex-1 text-sm">
						{doc.label ?? documentTypeLabel(doc.type)}
						{doc.expiryDate ? ` · exp ${doc.expiryDate}` : ''}
					</Typography.Paragraph>
					{isExpired(doc.expiryDate) ? (
						<Typography.Paragraph className="text-xs font-medium text-danger">
							Expired
						</Typography.Paragraph>
					) : null}
				</Pressable>
			))}
		</View>
	)
}

function SlotRow(props: {
	slot: Requirement
	attachedDoc: ApplicantDocument | undefined
	reusable: ApplicantDocument[]
	busy: boolean
	readOnly: boolean
	satisfied: boolean
	onUpload: () => void
	onReuse: (documentId: ApplicantDocument['_id']) => void
	onReview: () => void
	onConfirm: () => void
	onDetach: () => void
}) {
	const { slot, attachedDoc, reusable, busy, readOnly, satisfied } = props
	const [showReuse, setShowReuse] = useState(false)
	const requirement = evidenceRequirementFor(slot.requirementKey)
	const isPhysical = requirement?.fulfillment === 'physical'

	function confirm() {
		if (!requirement) return
		Alert.alert(
			'Confirm this evidence',
			`${requirement.guidance}\n\n${requirement.confirmationItems.map((item) => `• ${item}`).join('\n')}\n\nImmifile does not inspect the contents. Confirm only after you checked each item.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'I checked every item', onPress: props.onConfirm },
			],
		)
	}

	return (
		<View className="gap-hairline py-hairline">
			<View className="flex-row items-center gap-control">
				<StatusIcon satisfied={satisfied} />
				<View className="flex-1">
					<Typography.Paragraph className="font-medium">
						{requirementLabel(slot.requirementKey)}
					</Typography.Paragraph>
					{requirement ? (
						<Typography.Paragraph color="muted" className="text-xs leading-relaxed">
							{requirement.guidance}
						</Typography.Paragraph>
					) : null}
					{slot.status === 'attached' && attachedDoc ? (
						<Typography.Paragraph color="muted" className="text-sm">
							{attachedDoc.label ?? documentTypeLabel(attachedDoc.type)}
							{attachedDoc.expiryDate ? ` · exp ${attachedDoc.expiryDate}` : ''}
							{isExpired(attachedDoc.expiryDate) ? ' (expired)' : ''}
						</Typography.Paragraph>
					) : null}
				</View>
				{busy ? <Spinner size="sm" /> : null}
			</View>

			{!busy && !readOnly && !isPhysical && slot.status !== 'attached' ? (
				<View className="flex-row gap-tight pl-8">
					<Button variant="secondary" size="sm" onPress={props.onUpload}>
						<Button.Label>Upload</Button.Label>
					</Button>
					{reusable.length > 0 ? (
						<Button variant="ghost" size="sm" onPress={() => setShowReuse((open) => !open)}>
							<Button.Label>Use saved</Button.Label>
						</Button>
					) : null}
				</View>
			) : null}

			{!busy && !readOnly && !isPhysical && slot.status === 'attached' ? (
				<View className="flex-row flex-wrap gap-tight pl-8">
					{attachedDoc ? (
						<Button variant="ghost" size="sm" onPress={props.onReview}>
							<Button.Label>Review file</Button.Label>
						</Button>
					) : null}
					{!satisfied ? (
						<Button variant="secondary" size="sm" onPress={confirm}>
							<Button.Label>Confirm evidence</Button.Label>
						</Button>
					) : null}
					<Button variant="ghost" size="sm" onPress={props.onDetach}>
						<Button.Label>Remove</Button.Label>
					</Button>
				</View>
			) : null}

			{!busy && !readOnly && isPhysical && !satisfied ? (
				<View className="pl-8">
					<Button variant="secondary" size="sm" onPress={confirm}>
						<Button.Label>Confirm ready</Button.Label>
					</Button>
				</View>
			) : null}

			{!busy && !readOnly && isPhysical && satisfied ? (
				<View className="pl-8">
					<Button variant="ghost" size="sm" onPress={props.onDetach}>
						<Button.Label>Undo confirmation</Button.Label>
					</Button>
				</View>
			) : null}

			{showReuse && !isPhysical && slot.status !== 'attached' ? (
				<View className="pl-8">
					<ReuseList
						documents={reusable}
						onPick={(documentId) => {
							setShowReuse(false)
							props.onReuse(documentId)
						}}
					/>
				</View>
			) : null}
		</View>
	)
}

export function Documents() {
	const router = useRouter()
	const { requirements, requirementsReconciled, applicantDocuments, application, readiness } =
		useJourneyHub()
	const { busySlotId, uploadForSlot, attachExisting, confirm, detach } = useDocumentActions(
		application.applicantId,
	)
	const blockedRequirementKeys = new Set(
		readiness.blockers.flatMap((blocker) =>
			blocker.kind === 'document' ? [blocker.requirementKey] : [],
		),
	)

	return (
		<View className="gap-tight">
			<SectionHeading title="Documents" />
			<Typography.Paragraph color="muted" className="text-sm leading-relaxed">
				Immifile checks that the right requirement and file type are connected, but it cannot read
				or approve an upload. Open each file, check the requirement-specific list, and confirm it
				before readiness can turn complete.
			</Typography.Paragraph>
			{!requirementsReconciled ? (
				<View className="flex-row items-center gap-tight">
					<Spinner size="sm" />
					<Typography.Paragraph color="muted" className="text-sm">
						Updating this application’s evidence checklist…
					</Typography.Paragraph>
				</View>
			) : null}
			{requirements.length === 0 ? (
				<Typography.Paragraph color="muted">
					No documents are required for this application.
				</Typography.Paragraph>
			) : null}
			{requirements.map((slot) => {
				const attachedDoc =
					slot.documentId === undefined
						? undefined
						: applicantDocuments.find((doc) => doc._id === slot.documentId)
				// Offer only documents this requirement can actually accept
				// (same map the server enforces on attach), minus the one
				// already attached to this slot.
				const reusable = applicantDocuments.filter(
					(doc) =>
						doc.isCurrent &&
						doc._id !== slot.documentId &&
						isDocumentCompatible(slot.requirementKey, doc.type),
				)
				const satisfied = !blockedRequirementKeys.has(slot.requirementKey)
				return (
					<SlotRow
						key={slot._id}
						slot={slot}
						attachedDoc={attachedDoc}
						reusable={reusable}
						busy={busySlotId === slot._id}
						satisfied={satisfied}
						// The checklist freezes with the filing record (the server
						// rejects non-draft attach/detach — don't offer the buttons).
						readOnly={application.status !== 'draft'}
						onUpload={() => uploadForSlot(slot)}
						onReuse={(documentId) => attachExisting(slot._id, documentId)}
						onReview={() => {
							if (attachedDoc) router.push(`/documents/${attachedDoc._id}`)
						}}
						onConfirm={() => confirm(slot._id)}
						onDetach={() => detach(slot._id)}
					/>
				)
			})}
		</View>
	)
}
