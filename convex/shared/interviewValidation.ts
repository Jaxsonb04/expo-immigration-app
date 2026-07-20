import {
	addressShape,
	type ApplicationKind,
	type FormType,
	isUsStateCode,
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
	'immigration-history': {
		personFacts: [
			'locationAppliedVisa',
			'locationIssuedVisa',
			'becameResidentVia',
			'destinationAtAdmission',
			'portOfEntryCityState',
			'everInProceedings',
			'filedI407OrAbandoned',
		],
		form: [],
	},
	'a-number': { personFacts: ['aNumber'], form: [] },
	'mailing-address': {
		personFacts: ['mailingAddress'],
		form: ['physicalAddressSameAsMailing', 'physicalAddress'],
	},
	'applicant-statement': {
		personFacts: [],
		form: [
			'preparedSelfInEnglish',
			'requestingAccommodation',
			'accommodationDeafSignLanguage',
			'accommodationBlindDetail',
			'accommodationOtherDetail',
		],
	},
	'eligibility-category': { personFacts: ['eligibilityCategory'], form: ['replacementReason'] },
	'card-details': {
		personFacts: [],
		form: [
			'cardStatus',
			'cardExpirationDate',
			'replacementReason',
			'nameChangedSinceIssuance',
			'previousFamilyName',
			'previousGivenName',
			'previousMiddleName',
		],
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
			const mailingComplete =
				a.street.safeParse(addr.street).success &&
				a.city.safeParse(addr.city).success &&
				a.state.safeParse(addr.state).success &&
				a.zipCode.safeParse(addr.zipCode).success
			if (formType !== 'i90') return mailingComplete
			// i90 also asks Part 1 Item 7: physical address when different from
			// mailing. 'no' requires street + city plus a US state+ZIP or a
			// country (commuters normally live abroad).
			if (!mailingComplete) return false
			if (form.physicalAddressSameAsMailing === 'yes') return true
			if (form.physicalAddressSameAsMailing !== 'no') return false
			const phys = (form.physicalAddress ?? {}) as Record<string, unknown>
			// The state must be a real dropdown option (a typo would otherwise
			// only surface as a failed select at clean-export time).
			const hasUsLocation = isUsStateCode(phys.state) && isNonEmptyString(phys.zipCode)
			return (
				isNonEmptyString(phys.street) &&
				isNonEmptyString(phys.city) &&
				(hasUsLocation || isNonEmptyString(phys.country))
			)
		}
		case 'eligibility-category':
			// i765 final step: the category must be one this app actually prepares
			// (screening.ts single-source list — "notListed" and free-text values
			// can never complete the step); replacementReason only when replacing.
			return isSupportedI765Category(pf.eligibilityCategory) &&
				(applicationKind !== 'replacement' || isNonEmptyString(form.replacementReason))
		case 'immigration-history': {
			// i90-only: Part 3 Processing Information. A 'yes' on the proceedings
			// or I-407 questions requires a written Part 8 explanation this app
			// does not prepare, so the step honestly cannot complete (the UI
			// explains why and points at the official form).
			if (
				!shape.locationAppliedVisa.safeParse(pf.locationAppliedVisa).success ||
				!shape.locationIssuedVisa.safeParse(pf.locationIssuedVisa).success ||
				!shape.becameResidentVia.safeParse(pf.becameResidentVia).success
			) {
				return false
			}
			if (
				pf.becameResidentVia === 'immigrantVisa' &&
				(!shape.destinationAtAdmission.safeParse(pf.destinationAtAdmission).success ||
					!shape.portOfEntryCityState.safeParse(pf.portOfEntryCityState).success)
			) {
				return false
			}
			return pf.everInProceedings === 'no' && pf.filedI407OrAbandoned === 'no'
		}
		case 'applicant-statement': {
			// i90-only: Part 5 statement 1.A (self-prepared in English — 'no'
			// needs interpreter/preparer Parts 6/7, which this app does not
			// prepare) and Part 4 accommodations (explicit No box; 'yes' needs at
			// least one accommodation with its detail text).
			if (form.preparedSelfInEnglish !== 'yes') return false
			if (form.requestingAccommodation === 'no') return true
			if (form.requestingAccommodation !== 'yes') return false
			return (
				isNonEmptyString(form.accommodationDeafSignLanguage) ||
				isNonEmptyString(form.accommodationBlindDetail) ||
				isNonEmptyString(form.accommodationOtherDetail)
			)
		}
		case 'card-details': {
			// i90 final card step: card status is required and the combination must
			// pass eligibility screening (a conditional resident cannot renew via
			// I-90); cardExpirationDate stays optional; reason only when replacing.
			if (!isI90CardStatus(form.cardStatus)) return false
			if (!screenI90(form.cardStatus, applicationKind).supported) return false
			// Part 1 Item 4: the name-change question must be answered; 'yes'
			// requires the name as printed on the current card (Items 5.A-5.B).
			const nameAnswer = form.nameChangedSinceIssuance
			if (nameAnswer !== 'yes' && nameAnswer !== 'no' && nameAnswer !== 'neverReceivedCard') {
				return false
			}
			if (
				nameAnswer === 'yes' &&
				(!isNonEmptyString(form.previousFamilyName) || !isNonEmptyString(form.previousGivenName))
			) {
				return false
			}
			return applicationKind !== 'replacement' || isNonEmptyString(form.replacementReason)
		}
		default:
			// 'review' and any unknown key can never be marked complete.
			return false
	}
}
