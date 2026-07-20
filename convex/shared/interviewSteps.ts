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
	'immigration-history',
	'a-number',
	'mailing-address',
	'contact-info',
	'physical-description',
	'card-details',
	'applicant-statement',
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
// The base sets are static per (formType, applicationKind); ANSWER-AWARE
// additions layer on top via requiredSlotKeys' answers parameter (the printed
// I-90 Item 5 note requires attaching evidence for a legal name change).
// reconcileRequirements adds/deletes slots idempotently, so flipping an
// answer back removes a still-`needed` slot but never discards attachments.
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

// Loose on purpose: both draft-answer unions (and raw objects) are accepted;
// the one key that matters is read defensively.
type RequirementAnswers = { form?: unknown }

export function requiredSlotKeys(
	formType: FormType,
	applicationKind: ApplicationKind,
	answers?: RequirementAnswers,
): readonly string[] {
	const base = requirementTemplates[formType][applicationKind] ?? []
	const form = (answers?.form ?? {}) as { nameChangedSinceIssuance?: unknown }
	if (formType === 'i90' && form.nameChangedSinceIssuance === 'yes') {
		// Printed Item 5 NOTE: "Attach all evidence of your legal name change
		// with this application."
		return [...base, 'nameChangeEvidence']
	}
	return base
}
