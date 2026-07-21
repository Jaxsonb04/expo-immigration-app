import { humanErrorMessage } from '@/lib/error-message'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { DocumentType } from '@convex/shared/applicationShapes'
import { uploadDocumentType } from '@convex/shared/documentCompatibility'
import { useMutation } from 'convex/react'
import * as DocumentPicker from 'expo-document-picker'
import { useState } from 'react'
import { Alert } from 'react-native'

// M2-T3 document actions for the Journey Hub's Documents section: pick + upload
// a real file and attach it to a requirement slot, reuse an existing Vault
// document, or detach. Every mutation is owner-scoped on the server
// (convex/documents.ts); this is just the client orchestration. The
// requirement→type mapping lives in convex/shared/documentCompatibility.ts —
// the same map the server enforces on attach, so they can't drift.

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
	passport: 'Passport',
	ead: 'Work permit (EAD)',
	permanentResidentCard: 'Green card',
	i94: 'Form I-94',
	socialSecurityCard: 'Social Security card',
	photo: 'Photo',
	other: 'Document',
}

export function documentTypeLabel(type: DocumentType): string {
	return DOCUMENT_TYPE_LABEL[type]
}

type Slot = { _id: Id<'applicationDocuments'>; requirementKey: string }

export function useDocumentActions(applicantId: Id<'applicants'>) {
	const generateUploadUrl = useMutation(api.documents.generateUploadUrl)
	const saveDocument = useMutation(api.documents.saveDocument)
	const attachDocument = useMutation(api.documents.attachDocument)
	const detachDocument = useMutation(api.documents.detachDocument)
	const [busySlotId, setBusySlotId] = useState<string | null>(null)

	async function run(slotId: string, fn: () => Promise<unknown>) {
		setBusySlotId(slotId)
		try {
			await fn()
		} catch (error) {
			Alert.alert("Couldn't save your document", humanErrorMessage(error, 'Please try again.'))
		} finally {
			setBusySlotId(null)
		}
	}

	/** Pick a file, upload it to Convex storage, save it to the Vault for this
	 * applicant, and attach it to the slot. A no-op if the user cancels. */
	function uploadForSlot(slot: Slot) {
		return run(slot._id, async () => {
			const picked = await DocumentPicker.getDocumentAsync({
				type: ['image/*', 'application/pdf'],
				copyToCacheDirectory: true,
			})
			if (picked.canceled) return
			const file = picked.assets[0]!

			const uploadUrl = await generateUploadUrl({})
			const blob = await (await fetch(file.uri)).blob()
			const response = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.mimeType ?? 'application/octet-stream' },
				body: blob,
			})
			if (!response.ok) throw new Error('The upload did not complete. Please try again.')
			const { storageId } = (await response.json()) as { storageId: Id<'_storage'> }

			const documentId = await saveDocument({
				applicantId,
				type: uploadDocumentType(slot.requirementKey),
				storageId,
				label: file.name,
			})
			await attachDocument({ slotId: slot._id, documentId })
		})
	}

	/** Attach an already-uploaded Vault document (reuse — no new upload). */
	function attachExisting(slotId: Id<'applicationDocuments'>, documentId: Id<'documents'>) {
		return run(slotId, () => attachDocument({ slotId, documentId }))
	}

	function detach(slotId: Id<'applicationDocuments'>) {
		return run(slotId, () => detachDocument({ slotId }))
	}

	return { busySlotId, uploadForSlot, attachExisting, detach }
}
