import type { DocumentType } from './applicationShapes'
import { evidenceRequirements } from './evidenceRequirements'

// Which Vault document types can satisfy each requirement slot (workflow
// repair P1): the attach mutation enforces this server-side and the reuse
// picker filters by it client-side — ONE map, so they can't drift. A
// requirement key missing from this map is a template/map drift bug, so
// isDocumentCompatible fails CLOSED for it; the drift-guard test
// (documentCompatibility.test.ts) pins that every key requiredSlotKeys can
// produce has an entry.
export const compatibleDocumentTypes: Record<string, readonly DocumentType[]> = Object.fromEntries(
	Object.entries(evidenceRequirements)
		.filter(([, requirement]) => requirement.fulfillment === 'document')
		.map(([key, requirement]) => [key, requirement.acceptedDocumentTypes]),
)

export function isDocumentCompatible(requirementKey: string, type: DocumentType): boolean {
	return compatibleDocumentTypes[requirementKey]?.includes(type) ?? false
}

/** The Vault type a fresh upload for this requirement is stored as (the
 * requirement's primary compatible type; 'other' only for unknown keys). */
export function uploadDocumentType(requirementKey: string): DocumentType {
	return compatibleDocumentTypes[requirementKey]?.[0] ?? 'other'
}
