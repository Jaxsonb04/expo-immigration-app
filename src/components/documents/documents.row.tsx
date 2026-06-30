import { useConvex } from 'convex/react'
import * as WebBrowser from 'expo-web-browser'
import { Button, Card, Typography } from 'heroui-native'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { api } from '@/lib/api'
import { useDeleteDocument } from './documents.data'
import type { Document, DocumentType } from './documents.types'

const TYPE_LABEL: Record<DocumentType, string> = {
	passport: 'Passport',
	ead: 'EAD',
	greenCard: 'Green Card',
	i94: 'I-94',
	ssnCard: 'SSN Card',
	other: 'Other',
}

/**
 * One stored document, decoupled from any list container so it works in both a
 * plain column (recent list) and a FlashList (browse-all). "Open" fetches a
 * fresh signed URL on demand and opens it (re-download); "Delete" removes it.
 */
export function DocumentRow({ document }: { document: Document }) {
	const convex = useConvex()
	const deleteDocument = useDeleteDocument()
	const [busy, setBusy] = useState<{ id: string; action: 'open' | 'delete' } | null>(null)

	// FlashList recycles this row for different documents without remounting, so
	// key the busy state to the document id and ignore it for any other — a
	// recycled row never shows a stale "Opening…"/"Deleting…" or stays disabled
	// for the wrong document.
	const busyAction = busy?.id === document._id ? busy.action : null

	async function handleOpen(): Promise<void> {
		setBusy({ id: document._id, action: 'open' })
		try {
			const url = await convex.query(api.documents.getDocumentUrl, { documentId: document._id })
			if (url) {
				await WebBrowser.openBrowserAsync(url)
			} else {
				Alert.alert('Unavailable', 'This document has no stored file to open.')
			}
		} catch (err) {
			Alert.alert('Could not open', err instanceof Error ? err.message : 'Please try again.')
		} finally {
			setBusy(null)
		}
	}

	async function handleDelete(): Promise<void> {
		setBusy({ id: document._id, action: 'delete' })
		try {
			await deleteDocument({ documentId: document._id })
		} catch (err) {
			setBusy(null)
			Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.')
		}
	}

	return (
		<Card className="flex-row items-center justify-between gap-3 p-4">
			<View className="flex-1 gap-0.5">
				<Typography.Paragraph className="font-semibold">
					{TYPE_LABEL[document.type]}
				</Typography.Paragraph>
				<Typography.Paragraph color="muted" className="text-sm">
					Version {document.version}
					{document.expiryDate ? ` · Expires ${document.expiryDate}` : ''}
				</Typography.Paragraph>
			</View>
			<View className="flex-row gap-1">
				{document.storageId ? (
					<Button size="sm" variant="ghost" isDisabled={busyAction !== null} onPress={handleOpen}>
						<Button.Label>{busyAction === 'open' ? 'Opening…' : 'Open'}</Button.Label>
					</Button>
				) : null}
				<Button size="sm" variant="ghost" isDisabled={busyAction !== null} onPress={handleDelete}>
					<Button.Label>{busyAction === 'delete' ? 'Deleting…' : 'Delete'}</Button.Label>
				</Button>
			</View>
		</Card>
	)
}
