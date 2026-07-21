import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'

// getDocumentDetail returns null for a deleted/foreign id (never throws) —
// deleteDocument's own commit re-runs this screen's live subscription before
// navigation finishes, the same lesson as convex/applications.ts getApplication.
export type DocumentDetail = NonNullable<FunctionReturnType<typeof api.documents.getDocumentDetail>>

export function useDocumentDetail(documentId: Id<'documents'>): DocumentDetail | null | undefined {
	return useQuery(api.documents.getDocumentDetail, { documentId })
}

export function useUpdateDocumentExpiry() {
	return useMutation(api.documents.updateDocumentExpiry)
}

export function useDeleteDocument() {
	return useMutation(api.documents.deleteDocument)
}

export function useGenerateUploadUrl() {
	return useMutation(api.documents.generateUploadUrl)
}

export function useUploadNewVersion() {
	return useMutation(api.documents.uploadNewVersion)
}
