import { SectionHeading } from '@/components/core'
import { StyledLucideIcon } from '@/components/styled-icon'
import { requirementLabel } from '@/lib/application-labels'
import { Button, Spinner, Typography } from 'heroui-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { useJourneyHub } from './journey-hub.context'
import { documentTypeLabel, useDocumentActions } from './journey-hub.documents.data'

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
		<View className="mt-1 gap-1 rounded-xl bg-surface-secondary p-2">
			<Typography.Paragraph color="muted" className="px-1 text-xs">
				Use a saved document
			</Typography.Paragraph>
			{props.documents.map((doc) => (
				<Pressable
					key={doc._id}
					accessibilityRole="button"
					onPress={() => props.onPick(doc._id)}
					className="flex-row items-center gap-2 rounded-lg px-2 py-2"
				>
					<StyledLucideIcon name="file" size={16} className="text-muted" />
					<Typography.Paragraph className="flex-1 text-sm">
						{doc.label ?? documentTypeLabel(doc.type)}
						{doc.expiryDate ? ` · exp ${doc.expiryDate}` : ''}
					</Typography.Paragraph>
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
		<View className="gap-1 py-1">
			<View className="flex-row items-center gap-3">
				<StatusIcon status={slot.status} />
				<View className="flex-1">
					<Typography.Paragraph className="font-medium">
						{requirementLabel(slot.requirementKey)}
					</Typography.Paragraph>
					{slot.status === 'attached' && attachedDoc ? (
						<Typography.Paragraph color="muted" className="text-sm">
							{attachedDoc.label ?? documentTypeLabel(attachedDoc.type)}
							{attachedDoc.expiryDate ? ` · exp ${attachedDoc.expiryDate}` : ''}
						</Typography.Paragraph>
					) : null}
				</View>
				{busy ? <Spinner size="sm" /> : null}
			</View>

			{!busy && slot.status !== 'attached' && slot.status !== 'waived' ? (
				<View className="flex-row gap-2 pl-8">
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
		<View className="gap-2">
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
				// Don't offer a document already attached to this slot as a reuse option.
				const reusable = applicantDocuments.filter((doc) => doc._id !== slot.documentId)
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
