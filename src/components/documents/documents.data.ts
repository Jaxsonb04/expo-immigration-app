import { useMutation, useQuery } from 'convex/react'
import { api, type Doc, type Id } from '@/lib/api'

/** A stored vault document, typed from the Convex schema (server-driven types). */
export type Document = Doc<'documents'>
export type DocumentType = Document['type']

/**
 * Every document in an applicant's vault. `undefined` while loading; `[]` once
 * resolved with none (or when the caller does not own the applicant, since the
 * backend read-path returns empty rather than throwing).
 */
export function useDocuments(applicantId: Id<'applicants'>): Document[] | undefined {
	return useQuery(api.documents.listDocuments, { applicantId })
}

/** Mint a one-time upload URL to POST a file's bytes to before adding it. */
export function useGenerateUploadUrl() {
	return useMutation(api.documents.generateUploadUrl)
}

/** Record an uploaded file as a new document version on an applicant. */
export function useAddDocument() {
	return useMutation(api.documents.addDocument)
}

/** Delete a document (and its stored file) the caller owns. */
export function useDeleteDocument() {
	return useMutation(api.documents.deleteDocument)
}

/**
 * A signed download URL for a document's stored file. Pass `undefined` to skip
 * the query. Resolves to `null` when the caller is not the owner or there is no
 * stored file; `undefined` while loading.
 */
export function useDocumentUrl(
	documentId: Id<'documents'> | undefined,
): string | null | undefined {
	return useQuery(api.documents.getDocumentUrl, documentId ? { documentId } : 'skip')
}
