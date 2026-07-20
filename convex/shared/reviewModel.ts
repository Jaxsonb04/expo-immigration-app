import type { ZodType } from 'zod/v4'
import {
	addressShape,
	type ApplicationKind,
	type FormType,
	i765SpecificsShape,
	i90SpecificsShape,
	personFactsShape,
} from './applicationShapes'
import { preReviewStepKeys, requiredSlotKeys } from './interviewSteps'
import {
	accommodationDetailsApply,
	aNumberRequired,
	immigrantVisaDetailsApply,
	isStepComplete,
	physicalAddressApplies,
	physicalAddressComplete,
	previousNameApplies,
	replacementReasonApplies,
	stepOwnedKeys,
} from './interviewValidation'
import { isI90CardStatus, isSupportedI765Category, screenI90 } from './screening'

// The review model is the SINGLE source the answer-review screen renders from.
// It never re-implements a rule: group order comes from preReviewStepKeys,
// candidate rows from stepOwnedKeys, per-field applicability/required from the
// exported predicates in interviewValidation, group completeness VERBATIM from
// isStepComplete, and per-row validity from the authoritative applicationShapes
// zod field schemas. reviewModel.test.ts pins the consistency invariant
// (group.complete === all-rows-ok-or-optional-blank && no blocker) for every
// (form, kind, conditional-answer) combination, so the review screen can never
// disagree with the interview or the server readiness contract. Kept free of
// labels/formatting so it stays server-safe; the client owns display (review.labels.ts).

// 'blocked' = a present, schema-valid answer whose VALUE is what makes the step
// unfileable (an unsupported eligibility category, a conditional-resident
// renewal card, a "yes" that needs a Part-8 explanation, a non-English
// preparation). The row shows its value with a warning, so the per-row signal
// matches the group's "needs attention" chip instead of reading as complete.
export type ReviewRowStatus = 'ok' | 'missing' | 'invalid' | 'optional-blank' | 'blocked'

export type ReviewRow = {
	key: string
	namespace: 'personFacts' | 'form'
	required: boolean
	status: ReviewRowStatus
	rawValue: unknown
}

// A group-level reason the step cannot complete even though its visible rows
// are filled — a definitive answer choice the app can't carry to a filing.
export type GroupBlockerCode =
	| 'proceedings-need-explanation'
	| 'category-unsupported'
	| 'card-not-eligible'
	| 'needs-preparer-parts'
	| 'accommodation-detail-missing'

export type ReviewGroup = {
	stepKey: string
	rows: ReviewRow[]
	complete: boolean
	blocker?: GroupBlockerCode
}

export type ReviewModel = {
	groups: ReviewGroup[]
	documentKeys: string[]
}

type Answers = { personFacts: Record<string, unknown>; form: Record<string, unknown> }

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/** A value counts as absent when blank/empty across strings, arrays, and the
 * composite address objects (all sub-fields blank). */
function isEmptyValue(raw: unknown): boolean {
	if (raw === undefined || raw === null) return true
	if (typeof raw === 'string') return raw.trim() === ''
	if (Array.isArray(raw)) return raw.length === 0
	if (typeof raw === 'object') {
		return Object.values(raw).every(
			(v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === ''),
		)
	}
	return false
}

/** Rows that are collected but never required to complete a step. */
const ALWAYS_OPTIONAL = new Set([
	'middleName',
	'stateProvinceOfBirth',
	'secondCountryOfCitizenship',
	'email',
	'cardExpirationDate',
	'previousMiddleName',
	// Accommodation details are group-gated (at least one when requesting), not
	// individually required — the group blocker handles the "none provided" case.
	'accommodationDeafSignLanguage',
	'accommodationBlindDetail',
	'accommodationOtherDetail',
])

/** True when a candidate owned key is an applicable answer for this situation. */
function rowApplies(
	key: string,
	formType: FormType,
	applicationKind: ApplicationKind,
	answers: Answers,
): boolean {
	switch (key) {
		// mailing-address owns these form keys for BOTH forms, but they are an
		// i90-only question (Part 1 Item 7); physicalAddress only when it differs.
		case 'physicalAddressSameAsMailing':
			return formType === 'i90'
		case 'physicalAddress':
			return formType === 'i90' && physicalAddressApplies(answers.form)
		// Immigrant-visa entry details (Part 3 Items 3.A/3.A.1).
		case 'destinationAtAdmission':
		case 'portOfEntryCityState':
			return immigrantVisaDetailsApply(answers.personFacts)
		// The what-happened-to-your-card reason (both final steps own it).
		case 'replacementReason':
			return replacementReasonApplies(applicationKind)
		// Previous name (I-90 Items 5.A-5.C), only on a legal name change.
		case 'previousFamilyName':
		case 'previousGivenName':
		case 'previousMiddleName':
			return previousNameApplies(answers.form)
		// Accommodations are an I-90-only part (its Part 4); I-765 has none.
		case 'requestingAccommodation':
			return formType === 'i90'
		// Accommodation details, only when an accommodation is requested.
		case 'accommodationDeafSignLanguage':
		case 'accommodationBlindDetail':
		case 'accommodationOtherDetail':
			return formType === 'i90' && accommodationDetailsApply(answers.form)
		default:
			return true
	}
}

/** Whether an applicable row is required to complete its step. */
function rowRequired(
	key: string,
	formType: FormType,
	applicationKind: ApplicationKind,
): boolean {
	if (ALWAYS_OPTIONAL.has(key)) return false
	if (key === 'aNumber') return aNumberRequired(formType, applicationKind)
	return true
}

const NAMESPACE_SHAPES = {
	personFacts: () => personFactsShape.shape as Record<string, ZodType>,
	i765Form: () => i765SpecificsShape.shape as Record<string, ZodType>,
	i90Form: () => i90SpecificsShape.shape as Record<string, ZodType>,
}

/** The authoritative field schema for an owned key. */
function schemaFor(
	key: string,
	namespace: 'personFacts' | 'form',
	formType: FormType,
): ZodType | undefined {
	if (namespace === 'personFacts') return NAMESPACE_SHAPES.personFacts()[key]
	return formType === 'i765' ? NAMESPACE_SHAPES.i765Form()[key] : NAMESPACE_SHAPES.i90Form()[key]
}

function rowStatus(
	key: string,
	namespace: 'personFacts' | 'form',
	formType: FormType,
	required: boolean,
	rawValue: unknown,
): ReviewRowStatus {
	if (isEmptyValue(rawValue)) return required ? 'missing' : 'optional-blank'
	// The i90 physical address is "complete" by the same US-state-or-country
	// rule isStepComplete uses, which the loose zod shape does not capture.
	if (key === 'physicalAddress') {
		return physicalAddressComplete(asRecord(rawValue)) ? 'ok' : 'invalid'
	}
	if (key === 'mailingAddress') {
		return addressShape.safeParse(rawValue).success ? 'ok' : 'invalid'
	}
	const schema = schemaFor(key, namespace, formType)
	if (schema === undefined) return 'ok'
	return schema.safeParse(rawValue).success ? 'ok' : 'invalid'
}

/** The specific answer key(s) whose VALUE triggers a group blocker, so the
 * offending row can carry the same warning as the group chip. Value-based
 * blockers only; 'accommodation-detail-missing' is a missing-detail case with
 * no single offending value, so it marks no row. */
function blockedKeysFor(blocker: GroupBlockerCode | undefined, answers: Answers): Set<string> {
	const keys = new Set<string>()
	switch (blocker) {
		case 'proceedings-need-explanation':
			if (answers.personFacts.everInProceedings === 'yes') keys.add('everInProceedings')
			if (answers.personFacts.filedI407OrAbandoned === 'yes') keys.add('filedI407OrAbandoned')
			break
		case 'category-unsupported':
			keys.add('eligibilityCategory')
			break
		case 'card-not-eligible':
			keys.add('cardStatus')
			break
		case 'needs-preparer-parts':
			keys.add('preparedSelfInEnglish')
			break
		default:
			break
	}
	return keys
}

/** The group-level blocker (a set-but-unsupported answer), mapped from the same
 * conditions isStepComplete uses. Never fires on a merely-blank field — that is
 * a 'missing' row instead. */
function groupBlocker(
	stepKey: string,
	formType: FormType,
	applicationKind: ApplicationKind,
	answers: Answers,
): GroupBlockerCode | undefined {
	const { personFacts: pf, form } = answers
	switch (stepKey) {
		case 'immigration-history':
			return pf.everInProceedings === 'yes' || pf.filedI407OrAbandoned === 'yes'
				? 'proceedings-need-explanation'
				: undefined
		case 'eligibility-category':
			return typeof pf.eligibilityCategory === 'string' &&
				pf.eligibilityCategory !== '' &&
				!isSupportedI765Category(pf.eligibilityCategory)
				? 'category-unsupported'
				: undefined
		case 'card-details':
			return isI90CardStatus(form.cardStatus) &&
				!screenI90(form.cardStatus, applicationKind).supported
				? 'card-not-eligible'
				: undefined
		case 'applicant-statement':
			if (form.preparedSelfInEnglish === 'no') return 'needs-preparer-parts'
			if (
				formType === 'i90' &&
				form.requestingAccommodation === 'yes' &&
				isEmptyValue(form.accommodationDeafSignLanguage) &&
				isEmptyValue(form.accommodationBlindDetail) &&
				isEmptyValue(form.accommodationOtherDetail)
			) {
				return 'accommodation-detail-missing'
			}
			return undefined
		default:
			return undefined
	}
}

/**
 * Build the review model for a draft. Groups follow the interview blueprint
 * order; each group's rows are its owned, applicable answers with a per-row
 * status; group.complete is the server's own isStepComplete verdict.
 */
export function buildReviewModel(
	formType: FormType,
	applicationKind: ApplicationKind,
	rawAnswers: { personFacts?: unknown; form?: unknown },
): ReviewModel {
	const answers: Answers = {
		personFacts: asRecord(rawAnswers.personFacts),
		form: asRecord(rawAnswers.form),
	}

	const groups: ReviewGroup[] = preReviewStepKeys(formType).map((stepKey) => {
		const owned = stepOwnedKeys[stepKey] ?? { personFacts: [], form: [] }
		const blocker = groupBlocker(stepKey, formType, applicationKind, answers)
		const blockedKeys = blockedKeysFor(blocker, answers)
		const rows: ReviewRow[] = []
		for (const [namespace, keys] of [
			['personFacts', owned.personFacts],
			['form', owned.form],
		] as const) {
			for (const key of keys) {
				if (!rowApplies(key, formType, applicationKind, answers)) continue
				const required = rowRequired(key, formType, applicationKind)
				const rawValue = answers[namespace][key]
				// A value-based blocker flags its own row; otherwise fall to the
				// schema-driven status.
				const status: ReviewRowStatus = blockedKeys.has(key)
					? 'blocked'
					: rowStatus(key, namespace, formType, required, rawValue)
				rows.push({ key, namespace, required, status, rawValue })
			}
		}
		return {
			stepKey,
			rows,
			complete: isStepComplete(formType, applicationKind, stepKey, rawAnswers),
			blocker,
		}
	})

	return {
		groups,
		documentKeys: [...requiredSlotKeys(formType, applicationKind, rawAnswers)],
	}
}
