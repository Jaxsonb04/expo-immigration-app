import type { ApplicationKind, FormType, RequirementStatus } from './applicationShapes'
import { preReviewStepKeys } from './interviewSteps'
import { isStepComplete } from './interviewValidation'

// Server-owned readiness contract: the ONE authoritative answer to "can this
// application honestly be exported as a filing package?". Computed from the
// persisted draft + requirement slots — never from client-supplied booleans —
// and returned by getApplication so every surface (Journey Hub, export
// buttons, list labels) reads the same truth.
//
// Three blocker families:
//  - answers:  a pre-Review interview step's required fields are not present
//              and valid in the persisted draft. Re-derived per step via
//              isStepComplete rather than trusting stepCompletion flags, so a
//              forged or stale flag can never unlock export.
//  - document: a requirement slot is still `needed`.
//  - coverage: the app itself cannot yet produce a complete edition of this
//              form — items USCIS requires are not collected or not mapped
//              (docs/M2-T1-form-field-audit.md). These block clean export for
//              EVERY application of the form until the field contract is
//              completed, so the app never hands out a PDF that looks
//              fileable but is silently missing required items.

export type ReadinessBlocker =
	| { kind: 'answers'; stepKey: string }
	| { kind: 'document'; requirementKey: string }
	| { kind: 'coverage'; item: string }

export type ApplicationReadiness = {
	answersComplete: boolean
	documentsComplete: boolean
	/** False while the app's own field contract for this form is incomplete. */
	formCoverageComplete: boolean
	/** True only when there are zero blockers of any kind. */
	isReadyToFile: boolean
	blockers: ReadinessBlocker[]
}

// USCIS-required items the current interview/PDF contract does not cover,
// reconciled against the printed forms, the official instructions, and the
// current pdf maps (pdf.i765-map.ts / pdf.i90-map.ts). Shown verbatim in the
// Journey Hub honesty notice. Remove an entry ONLY when the item is collected,
// validated, persisted, AND written to the current form edition.
// Slice 3a closed the identity/contact gaps on both forms (citizenship, city/
// state of birth, daytime phone, email — all collected, validated, and mapped
// to verified fields). The earlier i765-replacement "reason not written" item
// was removed as NOT a filing gap: the printed I-765 has no what-happened
// field — its Part 1 replacement checkbox is mapped — so the app-collected
// reason is app-side context only.
// The I-765 Item 13 SSN box is "if known" and is DELIBERATELY left blank —
// the app never collects an SSN (this edition has no SSA card-request or
// consent items at all), which is a valid complete filing, so it is not a gap.
const I765_COVERAGE_GAPS: readonly string[] = [
	'Your most recent arrival in the U.S. (I-94 number, passport or travel document, date and place of last entry, and your status then and now)',
	'The extra questions a few eligibility categories require (for example the receipt number for a spouse of an H-1B holder, or the asylum-filing question for a pending asylum application)',
]

// Slice 3c: EMPTY — the I-90 field contract is complete. Every required
// applicant-facing printed item is either collected+mapped or has an explicit
// honest stop (a 'yes' on proceedings/I-407 or a non-English preparation
// needs Parts 6-8, and blocks the step with an explanation instead of
// exporting an incomplete form). Optional-by-form items deliberately left
// blank: USCIS online account number (Item 2, "if any"), SSN (Item 16,
// "if any"), in-care-of name (Item 6.A, mail routing), mobile phone (Part 5
// Item 4), commuter-POE reason 2.h.1 (not an offered situation).
// Signature/date are wet-ink per the filing instructions.
const I90_COVERAGE_GAPS: readonly string[] = []

/**
 * The known-missing required items for a situation. An empty result means the
 * field contract for that situation is complete and coverage no longer blocks.
 */
export function formCoverageGaps(
	formType: FormType,
	applicationKind: ApplicationKind,
): readonly string[] {
	void applicationKind // gaps are currently kind-independent for both forms
	return formType === 'i765' ? I765_COVERAGE_GAPS : I90_COVERAGE_GAPS
}

type DraftAnswers = { personFacts?: unknown; form?: unknown }

export function computeReadiness(args: {
	formType: FormType
	applicationKind: ApplicationKind
	answers: DraftAnswers
	requirements: readonly { requirementKey: string; status: RequirementStatus }[]
}): ApplicationReadiness {
	const blockers: ReadinessBlocker[] = []

	for (const stepKey of preReviewStepKeys(args.formType)) {
		if (!isStepComplete(args.formType, args.applicationKind, stepKey, args.answers)) {
			blockers.push({ kind: 'answers', stepKey })
		}
	}
	const answersComplete = blockers.length === 0

	const neededSlots = args.requirements.filter((slot) => slot.status === 'needed')
	for (const slot of neededSlots) {
		blockers.push({ kind: 'document', requirementKey: slot.requirementKey })
	}

	const gaps = formCoverageGaps(args.formType, args.applicationKind)
	for (const item of gaps) {
		blockers.push({ kind: 'coverage', item })
	}

	return {
		answersComplete,
		documentsComplete: neededSlots.length === 0,
		formCoverageComplete: gaps.length === 0,
		isReadyToFile: blockers.length === 0,
		blockers,
	}
}
