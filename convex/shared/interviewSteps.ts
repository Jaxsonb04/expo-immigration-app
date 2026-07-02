import type { ApplicationKind, FormType } from './applicationShapes'

// Ordered interview step keys per form family (ADR-0012/0013). These are the
// walkthrough-phase blueprints; branching (getVisibleSteps) arrives with the
// interview modules and must keep keys stable — saveApplicationStep is
// idempotent per (applicationId, stepKey).

export const REVIEW_STEP_KEY = 'review'

const i765Steps = [
	'legal-name',
	'date-of-birth',
	'country-of-birth',
	'a-number',
	'mailing-address',
	'eligibility-category',
	REVIEW_STEP_KEY,
] as const

const i90Steps = [
	'legal-name',
	'date-of-birth',
	'country-of-birth',
	'a-number',
	'mailing-address',
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
// Static for now; answer-dependent requirements plug into the reconciler.
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
