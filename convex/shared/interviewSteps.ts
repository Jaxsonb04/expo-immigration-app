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
	'other-information',
	'last-arrival',
	'a-number',
	'mailing-address',
	'contact-info',
	'eligibility-category',
	'applicant-statement',
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
export const requirementTemplates: Record<
	FormType,
	Partial<Record<ApplicationKind, readonly string[]>>
> = {
	i765: {
		initial: ['passportPhoto', 'entryDocument', 'identityEvidence'],
		renewal: ['eadCard', 'passportPhoto', 'entryDocument'],
		replacement: ['passportPhoto', 'entryDocument'],
	},
	i90: {
		renewal: ['permanentResidentCard'],
		replacement: [],
	},
}

// Category evidence reverified against the current USCIS Form I-765
// Instructions (edition 08/21/25). Keep the eight supported categories
// exhaustive: adding a supported category without an entry must fail tests,
// never silently fall back to kind-only evidence.
const i765CategoryRequirementKeys: Record<string, readonly string[]> = {
	C08: ['pendingAsylumEvidence'],
	C09: ['pendingI485Evidence'],
	C10: ['cancellationProceedingsEvidence'],
	C33: [],
	A05: ['asyleeStatusEvidence'],
	A03: ['refugeeStatusEvidence'],
	A17: ['applicantEStatusEvidence', 'spouseEStatusEvidence', 'marriageCertificate'],
	C26: ['h4StatusEvidence', 'marriageCertificate', 'h1bSpouseEligibilityEvidence'],
}

// Loose on purpose: both draft-answer unions (and raw objects) are accepted;
// evidence derivation reads only the named values defensively.
type RequirementAnswers = { personFacts?: unknown; form?: unknown }

export function requiredSlotKeys(
	formType: FormType,
	applicationKind: ApplicationKind,
	answers?: RequirementAnswers,
): readonly string[] {
	const base = requirementTemplates[formType][applicationKind] ?? []
	const personFacts = (answers?.personFacts ?? {}) as {
		eligibilityCategory?: unknown
		hasUsedOtherNames?: unknown
	}
	const form = (answers?.form ?? {}) as {
		replacementReason?: unknown
		nameChangedSinceIssuance?: unknown
		c8EverArrestedOrConvicted?: unknown
	}
	const keys = new Set(base)
	// The current I-765 instructions accept Form I-94, a passport, or another
	// travel document. They exempt category (c)(9) from this general item.
	// Model the alternatives as one requirement instead of making an optional
	// I-94 itself a universal blocker.
	if (formType === 'i765' && personFacts.eligibilityCategory === 'C09') {
		keys.delete('entryDocument')
	}
	if (formType === 'i765' && typeof personFacts.eligibilityCategory === 'string') {
		for (const key of i765CategoryRequirementKeys[personFacts.eligibilityCategory] ?? []) {
			keys.add(key)
		}
	}
	if (formType === 'i765' && personFacts.eligibilityCategory === 'C33') {
		if (applicationKind === 'replacement') {
			// USCIS's current DACA replacement path requires proof of current
			// DACA and does not use a new I-821D request.
			keys.add('currentDacaEvidence')
			keys.add('identityEvidence')
		} else {
			// Initial/renewal DACA requests travel with both companion forms;
			// the I-765 instructions exempt separate identity evidence beyond
			// the identity material submitted with I-821D.
			keys.delete('identityEvidence')
			keys.delete('eadCard')
			keys.add('formI821D')
			keys.add('formI765WS')
		}
	}
	if (
		formType === 'i765' &&
		applicationKind === 'replacement' &&
		personFacts.eligibilityCategory !== 'C33'
	) {
		if (form.replacementReason === 'damaged') {
			keys.add('eadCard')
		} else if (form.replacementReason === 'error') {
			keys.add('originalIncorrectEad')
			keys.add('correctBiographicEvidence')
		} else if (
			form.replacementReason === 'lost' ||
			form.replacementReason === 'stolen' ||
			form.replacementReason === 'destroyed'
		) {
			keys.add('identityEvidence')
		}
	}
	if (formType === 'i765' && personFacts.hasUsedOtherNames === 'yes') {
		keys.add('otherNamesEvidence')
	}
	if (formType === 'i90' && applicationKind === 'replacement') {
		switch (form.replacementReason) {
			case 'lost':
			case 'stolen':
			case 'destroyed':
			case 'damaged':
				keys.add('permanentResidentCardOrGovernmentId')
				break
			case 'error':
				keys.add('originalIncorrectPermanentResidentCard')
				keys.add('correctBiographicEvidence')
				break
			case 'nameChange':
				keys.add('nameChangeEvidence')
				break
		}
	}
	if (formType === 'i90' && form.nameChangedSinceIssuance === 'yes') {
		// Printed Item 5 NOTE: "Attach all evidence of your legal name change
		// with this application."
		keys.add('nameChangeEvidence')
	}
	if (
		formType === 'i765' &&
		personFacts.eligibilityCategory === 'C08' &&
		applicationKind !== 'replacement' &&
		form.c8EverArrestedOrConvicted === 'yes'
	) {
		// Printed Item 30 NOTE: a (c)(8) "Yes" requires court dispositions per
		// the Special Filing Instructions in the official I-765 instructions.
		keys.add('courtDispositions')
	}
	return [...keys]
}
