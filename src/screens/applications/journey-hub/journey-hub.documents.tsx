import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { requirementLabel } from '@/lib/application-labels'
import { isDocumentCompatible } from '@convex/shared/documentCompatibility'
import { Button, Spinner, Typography } from 'heroui-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'
import { documentTypeLabel, useDocumentActions } from './journey-hub.documents.data'

/** Past its expiry date. Expired ≠ unusable — an I-765 renewal attaches the
 * very card that's expiring — so this only drives an honest tag, not a block. */
function isExpired(expiryDate: string | undefined): boolean {
	if (!expiryDate) return false
	return new Date(`${expiryDate}T23:59:59`).getTime() < Date.now()
}

type Requirement = ReturnType<typeof useJourneyHub>['requirements'][number]
type ApplicantDocument = ReturnType<typeof useJourneyHub>['applicantDocuments'][number]

function StatusIcon({ status }: { status: Requirement['status'] }) {
	if (status === 'attached')
		return <StyledLucideIcon name="circle-check" size={20} className="text-success" />
	if (status === 'waived')
		return <StyledLucideIcon name="circle-minus" size={20} className="text-muted" />
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
	onUpload: () => void
	onReuse: (documentId: ApplicantDocument['_id']) => void
	onDetach: () => void
}) {
	const { slot, attachedDoc, reusable, busy } = props
	const [showReuse, setShowReuse] = useState(false)

	return (
		<View className="gap-hairline py-hairline">
			<View className="flex-row items-center gap-control">
				<StatusIcon status={slot.status} />
				<View className="flex-1">
					<Typography.Paragraph className="font-medium">
						{requirementLabel(slot.requirementKey)}
					</Typography.Paragraph>
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

			{!busy && slot.status !== 'attached' && slot.status !== 'waived' ? (
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

			{!busy && slot.status === 'attached' ? (
				<View className="pl-8">
					<Button variant="ghost" size="sm" onPress={props.onDetach}>
						<Button.Label>Remove</Button.Label>
					</Button>
				</View>
			) : null}

			{showReuse && slot.status !== 'attached' ? (
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
	const { requirements, applicantDocuments, application } = useJourneyHub()
	const { busySlotId, uploadForSlot, attachExisting, detach } = useDocumentActions(
		application.applicantId,
	)

	return (
		<View className="gap-tight">
			<SectionHeading title="Documents" />
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
						doc._id !== slot.documentId && isDocumentCompatible(slot.requirementKey, doc.type),
				)
				return (
					<SlotRow
						key={slot._id}
						slot={slot}
						attachedDoc={attachedDoc}
						reusable={reusable}
						busy={busySlotId === slot._id}
						onUpload={() => uploadForSlot(slot)}
						onReuse={(documentId) => attachExisting(slot._id, documentId)}
						onDetach={() => detach(slot._id)}
					/>
				)
			})}
		</View>
	)
}
