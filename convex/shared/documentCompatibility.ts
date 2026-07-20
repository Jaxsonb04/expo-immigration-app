import type { DocumentType } from './applicationShapes'

// Which Vault document types can satisfy each requirement slot (workflow
// repair P1): the attach mutation enforces this server-side and the reuse
// picker filters by it client-side — ONE map, so they can't drift. A
// requirement key missing from this map is a template/map drift bug, so
// isDocumentCompatible fails CLOSED for it; the drift-guard test
// (documentCompatibility.test.ts) pins that every key requiredSlotKeys can
// produce has an entry.
export const compatibleDocumentTypes: Record<string, readonly DocumentType[]> = {
	eadCard: ['ead'],
	passportPhoto: ['photo'],
	passport: ['passport'],
	i94: ['i94'],
	permanentResidentCard: ['permanentResidentCard'],
	// Evidence types without a dedicated Vault type (marriage certificate,
	// court order, certified dispositions) live under 'other'.
	nameChangeEvidence: ['other'],
	courtDispositions: ['other'],
}

export function isDocumentCompatible(requirementKey: string, type: DocumentType): boolean {
	return compatibleDocumentTypes[requirementKey]?.includes(type) ?? false
}

/** The Vault type a fresh upload for this requirement is stored as (the
 * requirement's primary compatible type; 'other' only for unknown keys). */
export function uploadDocumentType(requirementKey: string): DocumentType {
	return compatibleDocumentTypes[requirementKey]?.[0] ?? 'other'
}
