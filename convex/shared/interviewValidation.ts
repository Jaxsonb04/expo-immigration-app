import {
	addressShape,
	type ApplicationKind,
	type FormType,
	personFactsShape,
} from './applicationShapes'
import { isI90CardStatus, isSupportedI765Category, screenI90 } from './screening'

// M2-T2 server-side backstop. The interview wizard validates each step before
// it calls saveApplicationStep, but that guarantee lived ONLY on the client —
// a replayed/forged mutation or a client bug could mark a pre-Review step
// complete with missing data and unlock Review + the PDF Preview. This module
// gives the server its own authoritative view of (a) which draft keys each step
// owns and (b) whether a step's REQUIRED fields are actually present and valid,
// so completion is enforced where it counts. Keys mirror the interview
// blueprint (interviewSteps.ts) and the step bodies (interview.form.ts
// buildStepData); `interviewValidation.test.ts` pins them in sync.

type OwnedKeys = { personFacts: readonly string[]; form: readonly string[] }

/**
 * The draft keys each pre-Review step is responsible for. Used to make a save
 * authoritative for its own step: the server clears these keys before applying
 * the incoming slice, so a field the user cleared (an omitted optional) is
 * actually removed instead of retaining its stale prior value under a shallow
 * merge.
 *
 * MUST list every draft key a step's `buildStepData` writes. `ssn` and
 * `previousEadCardNumber` are absent because no step collects them yet (M2-T1
 * audit); when SSN / previous-EAD collection is wired (M2-T4), add its keys to
 * the owning step here, or a stale value could survive an unrelated step's clear.
 */
export const stepOwnedKeys: Record<string, OwnedKeys> = {
	'legal-name': { personFacts: ['givenName', 'middleName', 'familyName'], form: [] },
	'date-of-birth': { personFacts: ['dateOfBirth'], form: [] },
	'country-of-birth': {
		personFacts: ['countryOfBirth', 'cityOfBirth', 'stateProvinceOfBirth'],
		form: [],
	},
	citizenship: {
		personFacts: ['countryOfCitizenship', 'secondCountryOfCitizenship'],
		form: [],
	},
	'contact-info': { personFacts: ['daytimePhone', 'email'], form: [] },
	'personal-details': {
		personFacts: [
			'gender',
			'motherGivenName',
			'fatherGivenName',
			'classOfAdmission',
			'dateOfAdmission',
		],
		form: [],
	},
	'physical-description': {
		personFacts: [
			'heightFeet',
			'heightInches',
			'weightPounds',
			'eyeColor',
			'hairColor',
			'ethnicity',
			'races',
		],
		form: [],
	},
	'a-number': { personFacts: ['aNumber'], form: [] },
	'mailing-address': { personFacts: ['mailingAddress'], form: [] },
	'eligibility-category': { personFacts: ['eligibilityCategory'], form: ['replacementReason'] },
	'card-details': {
		personFacts: [],
		form: ['cardStatus', 'cardExpirationDate', 'replacementReason'],
	},
}

// Accepts the validated draft (Partial<PersonFacts> etc.) as well as loose
// objects — values are treated as unknown and re-validated per field.
type DraftAnswers = { personFacts?: unknown; form?: unknown }

function isNonEmptyString(value: unknown): boolean {
	return typeof value === 'string' && value.trim().length > 0
}

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/**
 * True when the step's OWNED required fields are present and valid in the merged
 * draft. Kind-aware for the two conditional fields: A-Number is optional for a
 * first-time work permit (i765 initial); `replacementReason` is required only
 * for the two replacement situations. A step whose owned fields are all optional
 * (i90 `card-details` on a renewal) is vacuously complete.
 */
export function isStepComplete(
	formType: FormType,
	applicationKind: ApplicationKind,
	stepKey: string,
	answers: DraftAnswers,
): boolean {
	const pf = asRecord(answers.personFacts)
	const form = asRecord(answers.form)
	const shape = personFactsShape.shape
	switch (stepKey) {
		case 'legal-name':
			return shape.givenName.safeParse(pf.givenName).success &&
				shape.familyName.safeParse(pf.familyName).success
		case 'date-of-birth':
			return shape.dateOfBirth.safeParse(pf.dateOfBirth).success
		case 'country-of-birth':
			// City is required on both printed forms; state/province is optional.
			return shape.countryOfBirth.safeParse(pf.countryOfBirth).success &&
				shape.cityOfBirth.safeParse(pf.cityOfBirth).success
		case 'citizenship':
			// i765-only step; the second citizenship line is optional.
			return shape.countryOfCitizenship.safeParse(pf.countryOfCitizenship).success
		case 'contact-info':
			// Daytime phone is required; email is optional on both printed forms.
			return shape.daytimePhone.safeParse(pf.daytimePhone).success
		case 'personal-details':
			// i90-only: Part 1 Additional Information (all required printed items).
			return (
				shape.gender.safeParse(pf.gender).success &&
				shape.motherGivenName.safeParse(pf.motherGivenName).success &&
				shape.fatherGivenName.safeParse(pf.fatherGivenName).success &&
				shape.classOfAdmission.safeParse(pf.classOfAdmission).success &&
				shape.dateOfAdmission.safeParse(pf.dateOfAdmission).success
			)
		case 'physical-description':
			// i90-only: Part 3 Biographic Information (all required; races multi).
			return (
				shape.heightFeet.safeParse(pf.heightFeet).success &&
				shape.heightInches.safeParse(pf.heightInches).success &&
				shape.weightPounds.safeParse(pf.weightPounds).success &&
				shape.eyeColor.safeParse(pf.eyeColor).success &&
				shape.hairColor.safeParse(pf.hairColor).success &&
				shape.ethnicity.safeParse(pf.ethnicity).success &&
				shape.races.safeParse(pf.races).success
			)
		case 'a-number':
			if (formType === 'i765' && applicationKind === 'initial') return true
			return shape.aNumber.safeParse(pf.aNumber).success
		case 'mailing-address': {
			const addr = (pf.mailingAddress ?? {}) as Record<string, unknown>
			const a = addressShape.shape
			return (
				a.street.safeParse(addr.street).success &&
				a.city.safeParse(addr.city).success &&
				a.state.safeParse(addr.state).success &&
				a.zipCode.safeParse(addr.zipCode).success
			)
		}
		case 'eligibility-category':
			// i765 final step: the category must be one this app actually prepares
			// (screening.ts single-source list — "notListed" and free-text values
			// can never complete the step); replacementReason only when replacing.
			return isSupportedI765Category(pf.eligibilityCategory) &&
				(applicationKind !== 'replacement' || isNonEmptyString(form.replacementReason))
		case 'card-details':
			// i90 final step: card status is required and the combination must pass
			// eligibility screening (a conditional resident cannot renew via I-90);
			// cardExpirationDate stays optional; reason only when replacing.
			if (!isI90CardStatus(form.cardStatus)) return false
			if (!screenI90(form.cardStatus, applicationKind).supported) return false
			return applicationKind !== 'replacement' || isNonEmptyString(form.replacementReason)
		default:
			// 'review' and any unknown key can never be marked complete.
			return false
	}
}
