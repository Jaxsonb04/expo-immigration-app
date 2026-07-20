import type { ApplicationKind, FormType } from './applicationShapes'

// Ordered interview step keys per form family (ADR-0012/0013). These are the
// walkthrough-phase blueprints; branching (getVisibleSteps) arrives with the
// interview modules and must keep keys stable — saveApplicationStep is
// idempotent per (applicationId, stepKey).

export const REVIEW_STEP_KEY = 'review'

// Slice 3a (field-contract completion): 'country-of-birth' also collects the
// city (and, for I-765, state/province) of birth; 'citizenship' (I-765 only)
// and 'contact-info' (both forms) are new steps. The existing keys are kept
// stable — in-flight drafts that completed the old 'country-of-birth' step
// simply become incomplete again until the city is answered (readiness
// re-derives per save, so nothing falsely claims completeness).

const i765Steps = [
	'legal-name',
	'date-of-birth',
	'country-of-birth',
	'citizenship',
	'a-number',
	'mailing-address',
	'contact-info',
	'eligibility-category',
	REVIEW_STEP_KEY,
] as const

const i90Steps = [
	'legal-name',
	'date-of-birth',
	'country-of-birth',
	'personal-details',
	'a-number',
	'mailing-address',
	'contact-info',
	'physical-description',
	'card-details',
	REVIEW_STEP_KEY,
] as const

export const interviewStepKeys: Record<FormType, readonly string[]> = {
	i765: i765Steps,
	i90: i90Steps,
}

/** Interview steps that must be complete before Review is reachable. */
export function preReviewStepKeys(formType: FormType): readonly string[] {
	return interviewStepKeys[formType].filter((key) => key !== REVIEW_STEP_KEY)
}

// Requirement-slot templates per supported situation (decision 7): slots are
// materialized at application creation and reconciled after each Next-save.
// These are STATIC per (formType, applicationKind): requirements do NOT vary by
// interview answers today — replacementReason (lost/stolen/damaged/error) and
// the i90 nameChange reason do not change the required-document set. Making them
// answer-aware would thread the draft answers into requiredSlotKeys +
// reconcileRequirements (which already add/delete slots idempotently); it is
// deferred until the per-reason document sets are decided.
export const requirementTemplates: Record<FormType, Partial<Record<ApplicationKind, readonly string[]>>> = {
	i765: {
		initial: ['passportPhoto', 'i94'],
		renewal: ['eadCard', 'passportPhoto'],
		replacement: ['passportPhoto', 'passport'],
	},
	i90: {
		renewal: ['permanentResidentCard', 'passportPhoto'],
		replacement: ['passportPhoto'],
	},
}

export function requiredSlotKeys(formType: FormType, applicationKind: ApplicationKind): readonly string[] {
	return requirementTemplates[formType][applicationKind] ?? []
}
