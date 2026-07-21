import type { Id } from '@convex/_generated/dataModel'
import * as DocumentPicker from 'expo-document-picker'

export type PickedUpload = { storageId: Id<'_storage'>; fileName: string }

/**
 * Pick a file (image or PDF) and upload it straight to Convex storage,
 * shared by every upload surface (Journey Hub requirement slots, Vault
 * replace) so the picker/POST logic can't drift between them. `generateUrl`
 * is the caller's own `api.documents.generateUploadUrl` mutation call — auth
 * context varies by call site, the upload mechanics never do. Returns null
 * if the user cancels the picker.
 */
export async function pickAndUploadFile(
	generateUrl: () => Promise<string>,
): Promise<PickedUpload | null> {
	const picked = await DocumentPicker.getDocumentAsync({
		type: ['image/*', 'application/pdf'],
		copyToCacheDirectory: true,
	})
	if (picked.canceled) return null
	const file = picked.assets[0]!

	const uploadUrl = await generateUrl()
	const blob = await (await fetch(file.uri)).blob()
	const response = await fetch(uploadUrl, {
		method: 'POST',
		headers: { 'Content-Type': file.mimeType ?? 'application/octet-stream' },
		body: blob,
	})
	if (!response.ok) throw new Error('The upload did not complete. Please try again.')
	const { storageId } = (await response.json()) as { storageId: Id<'_storage'> }
	return { storageId, fileName: file.name }
}
