import {
	addressShape,
	type ApplicationKind,
	type FormType,
	i765SpecificsShape,
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
	'legal-name': {
		personFacts: ['givenName', 'middleName', 'familyName', 'hasUsedOtherNames', 'otherNames'],
		form: [],
	},
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
	'last-arrival': {
		personFacts: [
			'i94Number',
			'usedTravelDocument',
			'passportNumber',
			'travelDocNumber',
			'travelDocCountryOfIssuance',
			'travelDocExpirationDate',
			'dateOfLastEntry',
			'placeOfLastEntry',
			'statusAtLastEntry',
			'currentImmigrationStatus',
			'sevisNumber',
		],
		form: [],
	},
	'a-number': { personFacts: ['aNumber'], form: [] },
	'mailing-address': {
		personFacts: ['mailingAddress'],
		form: ['physicalAddressSameAsMailing', 'physicalAddress'],
	},
	// Shared: both forms have an applicant's statement (I-765 Part 3 / I-90
	// Part 5). The accommodation items are I-90-only (its Part 4) — I-765 has
	// no accommodations part, so those keys simply do not apply there.
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
	// i765-only: Part 2 Other Information (Items 10-12).
	'other-information': {
		personFacts: ['gender', 'maritalStatus'],
		form: ['previouslyFiledI765'],
	},
	'eligibility-category': {
		personFacts: ['eligibilityCategory'],
		form: ['replacementReason', 'c26SpouseReceiptNumber', 'c8EverArrestedOrConvicted'],
	},
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

// ---------------------------------------------------------------------------
// Per-step applicability predicates. These are the SINGLE source of the
// conditional rules — `isStepComplete` (below) and the review model
// (reviewModel.ts) both call them, so the interview's completeness gate and
// the review screen's "which fields apply" derivation can never disagree.
// ---------------------------------------------------------------------------

/** A-Number is required except for a first-time work permit (i765 initial). */
export function aNumberRequired(formType: FormType, applicationKind: ApplicationKind): boolean {
	return !(formType === 'i765' && applicationKind === 'initial')
}

/** i90 physical address (Part 1 Item 7) is collected only when it differs. */
export function physicalAddressApplies(form: Record<string, unknown>): boolean {
	return form.physicalAddressSameAsMailing === 'no'
}

/**
 * The i90 physical address is complete when street + city are present plus
 * either a valid U.S. state and ZIP or a country (commuters live abroad).
 * Kept identical to the mailing-address branch of `isStepComplete` so the
 * review row's status matches the step's real completeness contract.
 */
export function physicalAddressComplete(phys: Record<string, unknown>): boolean {
	const hasUsLocation = isUsStateCode(phys.state) && isNonEmptyString(phys.zipCode)
	return (
		isNonEmptyString(phys.street) &&
		isNonEmptyString(phys.city) &&
		(hasUsLocation || isNonEmptyString(phys.country))
	)
}

/** i90 entry details (Part 3 Items 3.A/3.A.1) apply to immigrant-visa entries. */
export function immigrantVisaDetailsApply(personFacts: Record<string, unknown>): boolean {
	return personFacts.becameResidentVia === 'immigrantVisa'
}

/** i90 previous-name items (5.A-5.C) apply when the name legally changed. */
export function previousNameApplies(form: Record<string, unknown>): boolean {
	return form.nameChangedSinceIssuance === 'yes'
}

/** The what-happened-to-your-card reason applies to replacement situations. */
export function replacementReasonApplies(applicationKind: ApplicationKind): boolean {
	return applicationKind === 'replacement'
}

/** i90 accommodation detail fields apply when an accommodation is requested. */
export function accommodationDetailsApply(form: Record<string, unknown>): boolean {
	return form.requestingAccommodation === 'yes'
}

/** i765 other-name rows apply when the applicant has used other names. */
export function otherNamesApply(personFacts: Record<string, unknown>): boolean {
	return personFacts.hasUsedOtherNames === 'yes'
}

/** i765 passport/travel-document items (18-21) apply per the official
 * instructions: "If you used a passport or travel document to travel to the
 * United States". */
export function travelDocDetailsApply(personFacts: Record<string, unknown>): boolean {
	return personFacts.usedTravelDocument === 'yes'
}

/** i765 Item 29 applies only to the (c)(26) H-1B-spouse category. */
export function c26ReceiptApplies(personFacts: Record<string, unknown>): boolean {
	return personFacts.eligibilityCategory === 'C26'
}

/** i765 Item 30 applies only to the (c)(8) pending-asylum category. */
export function c8QuestionApplies(personFacts: Record<string, unknown>): boolean {
	return personFacts.eligibilityCategory === 'C08'
}

/** The I-765 physical address (Item 7 "U.S. Physical Address") is complete
 * only with a real US state + ZIP — no foreign escape, unlike the I-90's. */
export function physicalAddressUsComplete(phys: Record<string, unknown>): boolean {
	return (
		isNonEmptyString(phys.street) &&
		isNonEmptyString(phys.city) &&
		isUsStateCode(phys.state) &&
		isNonEmptyString(phys.zipCode)
	)
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
		case 'legal-name': {
			const nameOk =
				shape.givenName.safeParse(pf.givenName).success &&
				shape.familyName.safeParse(pf.familyName).success
			if (formType !== 'i765') return nameOk
			// i765 also owns Items 2-3 Other Names Used: the question must be
			// answered; 'yes' needs at least one complete other-name row.
			if (!nameOk) return false
			if (pf.hasUsedOtherNames === 'no') return true
			if (!otherNamesApply(pf)) return false
			return (
				Array.isArray(pf.otherNames) &&
				pf.otherNames.length > 0 &&
				shape.otherNames.safeParse(pf.otherNames).success
			)
		}
		case 'date-of-birth':
			return shape.dateOfBirth.safeParse(pf.dateOfBirth).success
		case 'country-of-birth':
			// City is required on both printed forms; state/province is optional.
			return (
				shape.countryOfBirth.safeParse(pf.countryOfBirth).success &&
				shape.cityOfBirth.safeParse(pf.cityOfBirth).success
			)
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
			if (!aNumberRequired(formType, applicationKind)) return true
			return shape.aNumber.safeParse(pf.aNumber).success
		case 'mailing-address': {
			const addr = (pf.mailingAddress ?? {}) as Record<string, unknown>
			const a = addressShape.shape
			const mailingComplete =
				a.street.safeParse(addr.street).success &&
				a.city.safeParse(addr.city).success &&
				a.state.safeParse(addr.state).success &&
				a.zipCode.safeParse(addr.zipCode).success
			// Both forms ask the same-as-physical question (I-765 Item 6 / I-90
			// Item 7 note); the I-90 allows a foreign physical address (commuters)
			// while the I-765's Item 7 is strictly a U.S. address.
			if (!mailingComplete) return false
			if (form.physicalAddressSameAsMailing === 'yes') return true
			if (!physicalAddressApplies(form)) return false
			const phys = (form.physicalAddress ?? {}) as Record<string, unknown>
			return formType === 'i90' ? physicalAddressComplete(phys) : physicalAddressUsComplete(phys)
		}
		case 'last-arrival': {
			// i765-only: Items 17-26. Items 22-25 are required for everyone; the
			// I-94 and SEVIS numbers are if-issued; the passport/travel-document
			// group applies only when one was used to travel to the U.S., and then
			// needs at least one document number plus country and expiration.
			if (
				!shape.dateOfLastEntry.safeParse(pf.dateOfLastEntry).success ||
				!shape.placeOfLastEntry.safeParse(pf.placeOfLastEntry).success ||
				!shape.statusAtLastEntry.safeParse(pf.statusAtLastEntry).success ||
				!shape.currentImmigrationStatus.safeParse(pf.currentImmigrationStatus).success
			) {
				return false
			}
			if (pf.usedTravelDocument === 'no') return true
			if (!travelDocDetailsApply(pf)) return false
			return (
				(isNonEmptyString(pf.passportNumber) || isNonEmptyString(pf.travelDocNumber)) &&
				isNonEmptyString(pf.travelDocCountryOfIssuance) &&
				shape.travelDocExpirationDate.safeParse(pf.travelDocExpirationDate).success
			)
		}
		case 'eligibility-category':
			// i765 final answer step: the category must be one this app actually
			// prepares ("notListed" and free-text values can never complete the
			// step); replacementReason only when replacing; the (c)(26) receipt
			// and (c)(8) arrest question only for their categories.
			if (!isSupportedI765Category(pf.eligibilityCategory)) return false
			if (replacementReasonApplies(applicationKind) && !isNonEmptyString(form.replacementReason)) {
				return false
			}
			if (
				c26ReceiptApplies(pf) &&
				!i765SpecificsShape.shape.c26SpouseReceiptNumber
					.unwrap()
					.safeParse(form.c26SpouseReceiptNumber).success
			) {
				return false
			}
			if (
				c8QuestionApplies(pf) &&
				form.c8EverArrestedOrConvicted !== 'yes' &&
				form.c8EverArrestedOrConvicted !== 'no'
			) {
				return false
			}
			return true
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
				immigrantVisaDetailsApply(pf) &&
				(!shape.destinationAtAdmission.safeParse(pf.destinationAtAdmission).success ||
					!shape.portOfEntryCityState.safeParse(pf.portOfEntryCityState).success)
			) {
				return false
			}
			return pf.everInProceedings === 'no' && pf.filedI407OrAbandoned === 'no'
		}
		case 'other-information':
			// i765-only: Part 2 Other Information (Items 10-12). Item 13 SSN is
			// "if known" and deliberately not collected, so it never gates.
			return (
				shape.gender.safeParse(pf.gender).success &&
				shape.maritalStatus.safeParse(pf.maritalStatus).success &&
				(form.previouslyFiledI765 === 'yes' || form.previouslyFiledI765 === 'no')
			)
		case 'applicant-statement': {
			// Both forms: the statement's self-prepared-in-English declaration —
			// 'no' means an interpreter/preparer was involved, which needs the
			// interpreter/preparer parts this app does not prepare.
			if (form.preparedSelfInEnglish !== 'yes') return false
			// Accommodations are an I-90-only part (its Part 4); I-765 has none.
			if (formType !== 'i90') return true
			if (!accommodationDetailsApply(form)) return form.requestingAccommodation === 'no'
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
				previousNameApplies(form) &&
				(!isNonEmptyString(form.previousFamilyName) || !isNonEmptyString(form.previousGivenName))
			) {
				return false
			}
			return !replacementReasonApplies(applicationKind) || isNonEmptyString(form.replacementReason)
		}
		default:
			// 'review' and any unknown key can never be marked complete.
			return false
	}
}
