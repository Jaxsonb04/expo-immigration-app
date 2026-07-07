import type { ApplicationKind, FormType } from '@convex/shared/applicationShapes'
import { supportedSituations } from '@convex/shared/applicationShapes'

// Pure situation helpers, kept free of React/convex-react/expo-router imports so
// they can be unit-tested directly (the useNewApplicationSubmit hook lives in
// new-application.data.ts and re-exports these).

export type Situation = { formType: FormType; applicationKind: ApplicationKind }

/** Radio value for "Myself" — the self applicant row may not exist yet (decision 3). */
export const SELF_CHOICE = 'self'
/** Radio value for "Someone else" — creates a dependent applicant on submit. */
export const NEW_DEPENDENT_CHOICE = 'new'

export function situationKey(situation: Situation): string {
	return `${situation.formType}:${situation.applicationKind}`
}

export function parseSituationKey(key: string): Situation {
	const found = supportedSituations.find((s) => situationKey(s) === key)
	if (found === undefined) throw new Error('Choose what you need to do')
	return found
}

/**
 * Resolve deep-link params (e.g. from the assistant's "Start this form" handoff,
 * M1-T4) to a preselected `situationKey`. Returns '' — no preselection — unless
 * the params name one of the five supported situations, so an unknown or
 * unsupported combo can never be silently preselected.
 */
export function situationKeyFromParams(
	formType: string | undefined,
	applicationKind: string | undefined,
): string {
	const match = supportedSituations.find(
		(s) => s.formType === formType && s.applicationKind === applicationKind,
	)
	return match ? situationKey(match) : ''
}

export { supportedSituations }
