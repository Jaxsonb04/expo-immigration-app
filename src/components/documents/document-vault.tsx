import * as DocumentPicker from 'expo-document-picker'
import { Button, Card, Spinner, Typography } from 'heroui-native'
import type { JSX } from 'react'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import type { Id } from '@/lib/api'
import {
	type Document,
	type DocumentType,
	useAddDocument,
	useDeleteDocument,
	useDocuments,
	useGenerateUploadUrl,
} from './documents.data'

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
	{ value: 'passport', label: 'Passport' },
	{ value: 'ead', label: 'EAD' },
	{ value: 'greenCard', label: 'Green Card' },
	{ value: 'i94', label: 'I-94' },
	{ value: 'ssnCard', label: 'SSN Card' },
	{ value: 'other', label: 'Other' },
]

const TYPE_LABEL: Record<DocumentType, string> = {
	passport: 'Passport',
	ead: 'EAD',
	greenCard: 'Green Card',
	i94: 'I-94',
	ssnCard: 'SSN Card',
	other: 'Other',
}

/**
 * An applicant's Document Vault: upload a passport/EAD/etc. (PDF or image),
 * see every stored version, and delete one. Wired to the Convex `documents`
 * functions and Convex's built-in file storage (ADR-0007).
 */
export function DocumentVault({ applicantId }: { applicantId: Id<'applicants'> }): JSX.Element {
	const documents = useDocuments(applicantId)
	const generateUploadUrl = useGenerateUploadUrl()
	const addDocument = useAddDocument()
	const [type, setType] = useState<DocumentType>('passport')
	const [uploading, setUploading] = useState(false)

	async function handleUpload(): Promise<void> {
		setUploading(true)
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: ['application/pdf', 'image/*'],
				copyToCacheDirectory: true,
			})
			const file = result.assets?.[0]
			if (result.canceled || file === undefined) {
				return
			}

			// 1. Mint a one-time upload URL from Convex.
			const uploadUrl = await generateUploadUrl()
			// 2. Read the picked file as a Blob and POST its bytes to that URL.
			const blob = await (await fetch(file.uri)).blob()
			const uploadResponse = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.mimeType ?? 'application/octet-stream' },
				body: blob,
			})
			if (!uploadResponse.ok) {
				throw new Error(`Upload failed (${uploadResponse.status})`)
			}
			// 3. Convex returns the new storage id; record it as a document version.
			const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> }
			await addDocument({ applicantId, type, storageId })
		} catch (err) {
			Alert.alert(
				'Could not upload document',
				err instanceof Error ? err.message : 'Please try again.',
			)
		} finally {
			setUploading(false)
		}
	}

	return (
		<View className="gap-4">
			<Card className="gap-4 p-5">
				<Typography.Paragraph className="font-semibold">Upload a document</Typography.Paragraph>

				<View className="gap-2">
					<Typography.Paragraph className="text-sm font-medium">
						Document type
					</Typography.Paragraph>
					<View className="flex-row flex-wrap gap-2">
						{DOCUMENT_TYPES.map((option) => {
							const selected = type === option.value
							return (
								<Button
									key={option.value}
									{...(selected ? {} : { variant: 'ghost' as const })}
									isDisabled={uploading}
									onPress={() => setType(option.value)}
								>
									<Button.Label>{option.label}</Button.Label>
								</Button>
							)
						})}
					</View>
				</View>

				<Button isDisabled={uploading} onPress={handleUpload}>
					<Button.Label>{uploading ? 'Uploading…' : 'Upload document'}</Button.Label>
				</Button>
			</Card>

			<View className="gap-3">
				{documents === undefined ? (
					<View className="items-center py-8">
						<Spinner />
					</View>
				) : documents.length === 0 ? (
					<Typography.Paragraph color="muted" className="py-8 text-center">
						No documents yet. Upload one to get started.
					</Typography.Paragraph>
				) : (
					documents.map((document) => <DocumentRow key={document._id} document={document} />)
				)}
			</View>
		</View>
	)
}

/** One stored document in the vault, with its type, version, and a delete action. */
function DocumentRow({ document }: { document: Document }): JSX.Element {
	const deleteDocument = useDeleteDocument()
	const [deleting, setDeleting] = useState(false)

	async function handleDelete(): Promise<void> {
		setDeleting(true)
		try {
			await deleteDocument({ documentId: document._id })
		} catch (err) {
			setDeleting(false)
			Alert.alert(
				'Could not delete document',
				err instanceof Error ? err.message : 'Please try again.',
			)
		}
	}

	return (
		<Card className="flex-row items-center justify-between gap-3 p-4">
			<View className="gap-1">
				<Typography.Paragraph className="font-semibold">
					{TYPE_LABEL[document.type]}
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm">
					Version {document.version}
					{document.expiryDate ? ` · Expires ${document.expiryDate}` : ''}
				</Typography.Paragraph>
			</View>
			<Button variant="ghost" isDisabled={deleting} onPress={handleDelete}>
				<Button.Label>{deleting ? 'Deleting…' : 'Delete'}</Button.Label>
			</Button>
		</Card>
	)
}
