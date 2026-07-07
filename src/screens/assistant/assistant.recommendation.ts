import type { ApplicationKind, FormType } from '@convex/shared/applicationShapes'
import type { AssistantRecommendation } from '@convex/shared/navigator'

import type { AssistantContent, SuggestedReply } from './assistant.types'

// M1-T3: the ONLY place the structured navigator result becomes user-facing
// copy. The navigator (convex/shared/navigator.ts) deterministically returns an
// `AssistantRecommendation`; the client never re-derives eligibility — it only
// renders. Kept pure and free of React so it can be unit-tested directly.

const CREDENTIAL_REPLIES: SuggestedReply[] = [
	{ id: 'cred-ead', label: 'Work permit (EAD)', message: 'It’s about my work permit (EAD).' },
	{ id: 'cred-green-card', label: 'Green card', message: 'It’s about my green card.' },
]

const SITUATION_REPLIES: SuggestedReply[] = [
	{ id: 'sit-first-time', label: 'First time', message: 'This is my first time applying.' },
	{ id: 'sit-renewal', label: 'Renewal', message: 'I’m renewing one I already have.' },
	{
		id: 'sit-replacement',
		label: 'Replacement',
		message: 'I need to replace a lost, stolen, or damaged card.',
	},
]

/** Opening suggestions that each carry a COMPLETE supported situation, so the
 * common cases resolve in one tap without walking the clarification loop. */
export const OPENING_REPLIES: SuggestedReply[] = [
	{
		id: 'open-i765-renewal',
		label: 'Renew my work permit',
		message: 'I need to renew my work permit (EAD).',
	},
	{
		id: 'open-i90-renewal',
		label: 'Renew my green card',
		message: 'I need to renew my green card.',
	},
	{
		id: 'open-i765-replacement',
		label: 'Replace a lost work permit',
		message: 'I need to replace my lost work permit.',
	},
	{
		id: 'open-i765-initial',
		label: 'First work permit',
		message: 'I’m applying for a work permit for the first time.',
	},
]

/** Human-readable form label used in the recommendation card, e.g. "Form I-765". */
export function formLabel(formType: FormType): string {
	return formType === 'i765' ? 'Form I-765' : 'Form I-90'
}

const CREDENTIAL_NOUN: Record<FormType, string> = {
	i765: 'Work permit',
	i90: 'Green card',
}

const KIND_SUFFIX: Record<ApplicationKind, string> = {
	initial: 'first-time application',
	renewal: 'renewal',
	replacement: 'replacement',
}

/** Card title, e.g. "Work permit renewal" / "Green card replacement". */
export function situationTitle(formType: FormType, applicationKind: ApplicationKind): string {
	return `${CREDENTIAL_NOUN[formType]} ${KIND_SUFFIX[applicationKind]}`
}

const OUT_OF_SCOPE_COPY: Record<
	Extract<AssistantRecommendation, { type: 'outOfScope' }>['reason'],
	string
> = {
	unsupportedForm:
		'Right now I can only help with work permits (Form I-765) and green cards (Form I-90). For other USCIS matters, a qualified immigration attorney or an accredited representative can guide you.',
	unsupportedSituation:
		'A first green card isn’t requested with Form I-90 — that form only renews or replaces a card you already have. If you’re applying for a green card for the first time, an immigration attorney can point you to the right process.',
	legalAdvice:
		'I can share general information about the process, but I can’t give legal advice or predict how a case will turn out. For questions about eligibility, categories, or a specific decision, please talk with a qualified immigration attorney or an accredited representative.',
}

/**
 * Map a deterministic navigator recommendation to the assistant turn the UI
 * renders. Exhaustive over the union (the `never` guard makes an unhandled arm
 * a compile error).
 */
export function describeRecommendation(rec: AssistantRecommendation): AssistantContent {
	switch (rec.type) {
		case 'supported':
			return {
				kind: 'recommendation',
				formType: rec.formType,
				applicationKind: rec.applicationKind,
				lead: 'Based on what you shared, this looks like the form below. I can help you get it ready — nothing is filed until you review and confirm.',
				title: situationTitle(rec.formType, rec.applicationKind),
				formLabel: formLabel(rec.formType),
			}
		case 'needsClarification':
			return rec.missing === 'credential'
				? {
						kind: 'text',
						text: 'Happy to help. First, which document is this about — your work permit (EAD) or your green card?',
						suggestions: CREDENTIAL_REPLIES,
					}
				: {
						kind: 'text',
						text: 'Got it. And is this a first-time application, a renewal, or a replacement for a lost, stolen, or damaged card?',
						suggestions: SITUATION_REPLIES,
					}
		case 'outOfScope':
			return { kind: 'text', text: OUT_OF_SCOPE_COPY[rec.reason] }
		default: {
			const _exhaustive: never = rec
			return _exhaustive
		}
	}
}
