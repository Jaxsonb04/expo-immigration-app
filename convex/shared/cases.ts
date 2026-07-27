/** Small, dependency-free safety bounds shared by the case backend and UI. */
export const CASE_NOTE_MAX = 500
export const MAX_CASE_STATUS_HISTORY = 100

export function normalizeCaseNote(raw: string | undefined): string | undefined {
	if (raw === undefined) return undefined
	const note = raw.trim()
	if (note.length === 0) return undefined
	if (note.length > CASE_NOTE_MAX) {
		throw new Error(`Case notes must be ${CASE_NOTE_MAX} characters or fewer`)
	}
	return note
}
