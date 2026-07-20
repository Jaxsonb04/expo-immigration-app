import { describe, expect, test } from 'vitest'

import { supportedSituations } from './applicationShapes'
import { preReviewStepKeys } from './interviewSteps'
import { isStepComplete, stepOwnedKeys } from './interviewValidation'

// M2-T2: the server-side completeness gate. These pin the invariant that a
// pre-Review step flips complete ONLY when its owned required fields are valid,
// kind-aware, so "reaches Review with valid data" is server-enforced.

const validPersonFacts = {
	givenName: 'Ana',
	middleName: '',
	familyName: 'Diaz',
	dateOfBirth: '1990-05-01',
	countryOfBirth: 'Mexico',
	cityOfBirth: 'Oaxaca',
	countryOfCitizenship: 'Mexico',
	daytimePhone: '5125550142',
	aNumber: '123456789',
	mailingAddress: { street: '1 Main St', city: 'Austin', state: 'TX', zipCode: '78701' },
	eligibilityCategory: 'C08',
	gender: 'female',
	maritalStatus: 'single',
	hasUsedOtherNames: 'no',
	dateOfLastEntry: '2019-08-14',
	placeOfLastEntry: 'JFK Airport, New York',
	statusAtLastEntry: 'F-1 student',
	currentImmigrationStatus: 'Pending asylum applicant',
	usedTravelDocument: 'yes',
	passportNumber: 'G12345678',
	travelDocCountryOfIssuance: 'Mexico',
	travelDocExpirationDate: '2026-01-01',
	motherGivenName: 'Rosa',
	fatherGivenName: 'Miguel',
	classOfAdmission: 'IR1',
	dateOfAdmission: '2015-06-10',
	heightFeet: '5',
	heightInches: '4',
	weightPounds: '130',
	eyeColor: 'brown',
	hairColor: 'black',
	ethnicity: 'hispanicOrLatino',
	races: ['white'],
	locationAppliedVisa: 'Ciudad Juarez, Mexico',
	locationIssuedVisa: 'Ciudad Juarez, Mexico',
	becameResidentVia: 'immigrantVisa',
	destinationAtAdmission: 'Austin, TX',
	portOfEntryCityState: 'San Ysidro, CA',
	everInProceedings: 'no',
	filedI407OrAbandoned: 'no',
}

const formFor = (situation: { formType: string; applicationKind: string }) => ({
	...(situation.formType === 'i765'
		? {
				previouslyFiledI765: 'no',
				preparedSelfInEnglish: 'yes',
				physicalAddressSameAsMailing: 'yes',
				c8EverArrestedOrConvicted: 'no',
			}
		: {}),
	...(situation.formType === 'i90'
		? {
				cardStatus: 'permanentResident',
				nameChangedSinceIssuance: 'no',
				physicalAddressSameAsMailing: 'yes',
				preparedSelfInEnglish: 'yes',
				requestingAccommodation: 'no',
			}
		: {}),
	...(situation.applicationKind === 'replacement' ? { replacementReason: 'lost' } : {}),
})

describe('stepOwnedKeys stays in sync with the blueprint', () => {
	test('covers exactly the union of both forms pre-Review steps', () => {
		const union = new Set([...preReviewStepKeys('i765'), ...preReviewStepKeys('i90')])
		expect(new Set(Object.keys(stepOwnedKeys))).toEqual(union)
	})
})

describe('isStepComplete — happy path', () => {
	for (const situation of supportedSituations) {
		const key = `${situation.formType}/${situation.applicationKind}`
		test(`every pre-Review step is complete for ${key} with full valid data`, () => {
			const answers = { personFacts: validPersonFacts, form: formFor(situation) }
			for (const stepKey of preReviewStepKeys(situation.formType)) {
				expect(
					isStepComplete(situation.formType, situation.applicationKind, stepKey, answers),
					`${stepKey} should be complete for ${key}`,
				).toBe(true)
			}
		})
	}
})

describe('isStepComplete — required fields enforced', () => {
	const answers = (over: Partial<typeof validPersonFacts>) => ({
		personFacts: { ...validPersonFacts, ...over },
		form: {},
	})

	test('legal-name needs given and family name', () => {
		expect(isStepComplete('i765', 'renewal', 'legal-name', answers({ givenName: '' }))).toBe(false)
		expect(isStepComplete('i765', 'renewal', 'legal-name', answers({ familyName: '' }))).toBe(false)
	})

	test('mailing-address needs street/city/state/zip', () => {
		expect(
			isStepComplete('i90', 'renewal', 'mailing-address', {
				personFacts: {
					...validPersonFacts,
					mailingAddress: { street: '1 Main St', city: 'Austin', state: '', zipCode: '78701' },
				},
				form: {},
			}),
		).toBe(false)
	})

	test('middleName is optional — blank still completes legal-name', () => {
		expect(isStepComplete('i90', 'renewal', 'legal-name', answers({ middleName: '' }))).toBe(true)
	})

	test('country-of-birth needs the city too (slice 3a); state/province stays optional', () => {
		expect(isStepComplete('i765', 'renewal', 'country-of-birth', answers({}))).toBe(true)
		expect(
			isStepComplete('i765', 'renewal', 'country-of-birth', answers({ cityOfBirth: '' })),
		).toBe(false)
		expect(isStepComplete('i90', 'renewal', 'country-of-birth', answers({ cityOfBirth: '' }))).toBe(
			false,
		)
	})

	test('citizenship needs the first country; the second is optional', () => {
		expect(isStepComplete('i765', 'renewal', 'citizenship', answers({}))).toBe(true)
		expect(
			isStepComplete('i765', 'renewal', 'citizenship', answers({ countryOfCitizenship: '' })),
		).toBe(false)
	})

	test('personal-details needs every Part 1 additional-information item', () => {
		expect(isStepComplete('i90', 'renewal', 'personal-details', answers({}))).toBe(true)
		for (const missing of [
			{ gender: '' },
			{ motherGivenName: '' },
			{ fatherGivenName: '' },
			{ classOfAdmission: '' },
			{ dateOfAdmission: 'not-a-date' },
		]) {
			expect(isStepComplete('i90', 'renewal', 'personal-details', answers(missing))).toBe(false)
		}
	})

	test('physical-description needs the full biographic block, races non-empty', () => {
		expect(isStepComplete('i90', 'renewal', 'physical-description', answers({}))).toBe(true)
		for (const missing of [
			{ heightFeet: '' },
			{ heightInches: '12' },
			{ weightPounds: 'abc' },
			{ eyeColor: 'purple' },
			{ hairColor: '' },
			{ ethnicity: '' },
			{ races: [] },
		]) {
			expect(isStepComplete('i90', 'renewal', 'physical-description', answers(missing))).toBe(false)
		}
	})

	test('contact-info needs a 10-digit phone; email is optional', () => {
		expect(isStepComplete('i765', 'renewal', 'contact-info', answers({}))).toBe(true)
		expect(isStepComplete('i90', 'renewal', 'contact-info', answers({ daytimePhone: '' }))).toBe(
			false,
		)
		expect(
			isStepComplete('i90', 'renewal', 'contact-info', answers({ daytimePhone: '555-0142' })),
		).toBe(false)
	})
})

describe('isStepComplete — kind-aware branches', () => {
	test('A-Number is optional only for i765 initial', () => {
		const blank = { personFacts: { ...validPersonFacts, aNumber: '' }, form: {} }
		expect(isStepComplete('i765', 'initial', 'a-number', blank)).toBe(true)
		expect(isStepComplete('i765', 'renewal', 'a-number', blank)).toBe(false)
		expect(isStepComplete('i90', 'renewal', 'a-number', blank)).toBe(false)
	})

	test('replacementReason required only for the replacement situations', () => {
		// validPersonFacts uses C08, so its Item 30 must be answered here.
		const noReason = { personFacts: validPersonFacts, form: { c8EverArrestedOrConvicted: 'no' } }
		const withReason = {
			personFacts: validPersonFacts,
			form: { replacementReason: 'lost', c8EverArrestedOrConvicted: 'no' },
		}
		// i765 final step (eligibility-category)
		expect(isStepComplete('i765', 'renewal', 'eligibility-category', noReason)).toBe(true)
		expect(isStepComplete('i765', 'replacement', 'eligibility-category', noReason)).toBe(false)
		expect(isStepComplete('i765', 'replacement', 'eligibility-category', withReason)).toBe(true)
		// i90 final card step — status- and name-change-gated always, reason-gated
		// for replacement
		const status = { cardStatus: 'permanentResident', nameChangedSinceIssuance: 'no' }
		expect(
			isStepComplete('i90', 'renewal', 'card-details', {
				personFacts: validPersonFacts,
				form: status,
			}),
		).toBe(true)
		expect(
			isStepComplete('i90', 'replacement', 'card-details', {
				personFacts: validPersonFacts,
				form: status,
			}),
		).toBe(false)
		expect(
			isStepComplete('i90', 'replacement', 'card-details', {
				personFacts: validPersonFacts,
				form: { ...status, replacementReason: 'lost' },
			}),
		).toBe(true)
	})

	test('i90 card-details requires a card status (screening slice 2)', () => {
		expect(
			isStepComplete('i90', 'renewal', 'card-details', { personFacts: validPersonFacts, form: {} }),
		).toBe(false)
		expect(
			isStepComplete('i90', 'renewal', 'card-details', {
				personFacts: validPersonFacts,
				form: { cardStatus: 'not-a-status' },
			}),
		).toBe(false)
	})

	test('a conditional resident can never complete a renewal card-details step', () => {
		const conditional = { cardStatus: 'conditionalResident', nameChangedSinceIssuance: 'no' }
		expect(
			isStepComplete('i90', 'renewal', 'card-details', {
				personFacts: validPersonFacts,
				form: conditional,
			}),
		).toBe(false)
		// …but a conditional-resident REPLACEMENT is supported.
		expect(
			isStepComplete('i90', 'replacement', 'card-details', {
				personFacts: validPersonFacts,
				form: { ...conditional, replacementReason: 'lost' },
			}),
		).toBe(true)
	})

	test('card-details name-change gate: Yes needs the name printed on the card', () => {
		const base = { cardStatus: 'permanentResident' }
		expect(
			isStepComplete('i90', 'renewal', 'card-details', {
				personFacts: validPersonFacts,
				form: base,
			}),
		).toBe(false)
		expect(
			isStepComplete('i90', 'renewal', 'card-details', {
				personFacts: validPersonFacts,
				form: { ...base, nameChangedSinceIssuance: 'yes' },
			}),
		).toBe(false)
		expect(
			isStepComplete('i90', 'renewal', 'card-details', {
				personFacts: validPersonFacts,
				form: {
					...base,
					nameChangedSinceIssuance: 'yes',
					previousFamilyName: 'Santos',
					previousGivenName: 'Maria',
				},
			}),
		).toBe(true)
		expect(
			isStepComplete('i90', 'renewal', 'card-details', {
				personFacts: validPersonFacts,
				form: { ...base, nameChangedSinceIssuance: 'neverReceivedCard' },
			}),
		).toBe(true)
	})

	test('immigration-history: conditional entry fields and fail-closed Part 8 answers', () => {
		const complete = { personFacts: validPersonFacts, form: {} }
		expect(isStepComplete('i90', 'renewal', 'immigration-history', complete)).toBe(true)
		// Adjustment-of-status does not need destination/port of entry.
		expect(
			isStepComplete('i90', 'renewal', 'immigration-history', {
				personFacts: {
					...validPersonFacts,
					becameResidentVia: 'adjustmentOfStatus',
					destinationAtAdmission: '',
					portOfEntryCityState: '',
				},
				form: {},
			}),
		).toBe(true)
		// Immigrant-visa entry requires both.
		expect(
			isStepComplete('i90', 'renewal', 'immigration-history', {
				personFacts: { ...validPersonFacts, destinationAtAdmission: '' },
				form: {},
			}),
		).toBe(false)
		// A 'yes' on proceedings or I-407 needs Part 8 — never completes.
		for (const over of [{ everInProceedings: 'yes' }, { filedI407OrAbandoned: 'yes' }]) {
			expect(
				isStepComplete('i90', 'renewal', 'immigration-history', {
					personFacts: { ...validPersonFacts, ...over },
					form: {},
				}),
			).toBe(false)
		}
	})

	test('mailing-address (i90): physical-address question gates completion', () => {
		const mailingOnly = { personFacts: validPersonFacts, form: {} }
		// BOTH forms now ask the physical-address question (I-765 Item 6 too).
		expect(isStepComplete('i765', 'renewal', 'mailing-address', mailingOnly)).toBe(false)
		expect(isStepComplete('i90', 'renewal', 'mailing-address', mailingOnly)).toBe(false)
		expect(
			isStepComplete('i90', 'renewal', 'mailing-address', {
				personFacts: validPersonFacts,
				form: { physicalAddressSameAsMailing: 'yes' },
			}),
		).toBe(true)
		// Different address needs street + city plus US state+ZIP or a country.
		const differing = (physicalAddress: Record<string, string>) =>
			isStepComplete('i90', 'renewal', 'mailing-address', {
				personFacts: validPersonFacts,
				form: { physicalAddressSameAsMailing: 'no', physicalAddress },
			})
		expect(differing({ street: '1 Calle Real', city: 'Tijuana', country: 'Mexico' })).toBe(true)
		expect(differing({ street: '9 Elm St', city: 'Austin', state: 'TX', zipCode: '78701' })).toBe(
			true,
		)
		expect(differing({ street: '9 Elm St', city: 'Austin' })).toBe(false)
		// A code missing from the printed dropdown must not count as a US state
		// (it would only fail later, at clean-export select time).
		expect(differing({ street: '9 Elm St', city: 'Austin', state: 'ZZ', zipCode: '78701' })).toBe(
			false,
		)
	})

	test('mailing state must be a real dropdown option (case-insensitive)', () => {
		const withState = (state: string) =>
			isStepComplete('i765', 'renewal', 'mailing-address', {
				personFacts: {
					...validPersonFacts,
					mailingAddress: { street: '1 Main St', city: 'Austin', state, zipCode: '78701' },
				},
				form: { physicalAddressSameAsMailing: 'yes' },
			})
		expect(withState('TX')).toBe(true)
		expect(withState('tx')).toBe(true)
		expect(withState('ZZ')).toBe(false)
	})

	test('i765 legal-name: the other-names question gates completion', () => {
		const base = { ...validPersonFacts }
		expect(
			isStepComplete('i765', 'renewal', 'legal-name', {
				personFacts: { ...base, hasUsedOtherNames: '' },
				form: {},
			}),
		).toBe(false)
		expect(
			isStepComplete('i765', 'renewal', 'legal-name', {
				personFacts: { ...base, hasUsedOtherNames: 'yes' },
				form: {},
			}),
		).toBe(false)
		expect(
			isStepComplete('i765', 'renewal', 'legal-name', {
				personFacts: {
					...base,
					hasUsedOtherNames: 'yes',
					otherNames: [{ familyName: 'Diaz', givenName: 'Anita' }],
				},
				form: {},
			}),
		).toBe(true)
		// The i90 does not ask it.
		expect(
			isStepComplete('i90', 'renewal', 'legal-name', {
				personFacts: { ...base, hasUsedOtherNames: '' },
				form: {},
			}),
		).toBe(true)
	})

	test('i765 last-arrival: required core, conditional travel-document group', () => {
		const complete = { personFacts: validPersonFacts, form: {} }
		expect(isStepComplete('i765', 'renewal', 'last-arrival', complete)).toBe(true)
		// No document used: the group is not required.
		expect(
			isStepComplete('i765', 'renewal', 'last-arrival', {
				personFacts: {
					...validPersonFacts,
					usedTravelDocument: 'no',
					passportNumber: '',
					travelDocCountryOfIssuance: '',
					travelDocExpirationDate: '',
				},
				form: {},
			}),
		).toBe(true)
		// Used one: needs a number + country + expiration.
		expect(
			isStepComplete('i765', 'renewal', 'last-arrival', {
				personFacts: { ...validPersonFacts, passportNumber: '', travelDocNumber: '' },
				form: {},
			}),
		).toBe(false)
		// Core items are required for everyone.
		expect(
			isStepComplete('i765', 'renewal', 'last-arrival', {
				personFacts: { ...validPersonFacts, placeOfLastEntry: '' },
				form: {},
			}),
		).toBe(false)
	})

	test('i765 eligibility: category-specific items gate their categories only', () => {
		const withCategory = (eligibilityCategory: string, form: Record<string, unknown>) =>
			isStepComplete('i765', 'renewal', 'eligibility-category', {
				personFacts: { ...validPersonFacts, eligibilityCategory },
				form,
			})
		expect(withCategory('C09', {})).toBe(true)
		expect(withCategory('C26', {})).toBe(false)
		expect(withCategory('C26', { c26SpouseReceiptNumber: 'WAC1234567890' })).toBe(true)
		expect(withCategory('C26', { c26SpouseReceiptNumber: 'BAD' })).toBe(false)
		expect(withCategory('C08', {})).toBe(false)
		expect(withCategory('C08', { c8EverArrestedOrConvicted: 'yes' })).toBe(true)
		expect(withCategory('C08', { c8EverArrestedOrConvicted: 'no' })).toBe(true)
	})

	test('i765 mailing-address: physical question required, US-only when different', () => {
		const withForm = (form: Record<string, unknown>) =>
			isStepComplete('i765', 'renewal', 'mailing-address', {
				personFacts: validPersonFacts,
				form,
			})
		expect(withForm({})).toBe(false)
		expect(withForm({ physicalAddressSameAsMailing: 'yes' })).toBe(true)
		// A foreign physical address is NOT acceptable on the I-765.
		expect(
			withForm({
				physicalAddressSameAsMailing: 'no',
				physicalAddress: { street: '1 Calle Real', city: 'Tijuana', country: 'Mexico' },
			}),
		).toBe(false)
		expect(
			withForm({
				physicalAddressSameAsMailing: 'no',
				physicalAddress: { street: '9 Elm St', city: 'Austin', state: 'TX', zipCode: '78701' },
			}),
		).toBe(true)
	})

	test('applicant-statement: English self-preparation and accommodations gate', () => {
		const withForm = (form: Record<string, unknown>) =>
			isStepComplete('i90', 'renewal', 'applicant-statement', {
				personFacts: validPersonFacts,
				form,
			})
		expect(withForm({ preparedSelfInEnglish: 'yes', requestingAccommodation: 'no' })).toBe(true)
		// Interpreter/preparer cases need Parts 6/7 — never complete.
		expect(withForm({ preparedSelfInEnglish: 'no', requestingAccommodation: 'no' })).toBe(false)
		expect(withForm({ preparedSelfInEnglish: 'yes' })).toBe(false)
		expect(withForm({ preparedSelfInEnglish: 'yes', requestingAccommodation: 'yes' })).toBe(false)
		expect(
			withForm({
				preparedSelfInEnglish: 'yes',
				requestingAccommodation: 'yes',
				accommodationDeafSignLanguage: 'American Sign Language',
			}),
		).toBe(true)
	})

	test('i765 eligibility-category needs a SUPPORTED category', () => {
		const withCategory = (eligibilityCategory: string) => ({
			personFacts: { ...validPersonFacts, eligibilityCategory },
			form: {},
		})
		expect(isStepComplete('i765', 'renewal', 'eligibility-category', withCategory(''))).toBe(false)
		// "Not listed" and unknown codes can never complete the step — the app
		// only prepares the categories in shared/screening.ts.
		expect(
			isStepComplete('i765', 'renewal', 'eligibility-category', withCategory('notListed')),
		).toBe(false)
		expect(isStepComplete('i765', 'renewal', 'eligibility-category', withCategory('C99'))).toBe(
			false,
		)
		expect(isStepComplete('i765', 'renewal', 'eligibility-category', withCategory('A17'))).toBe(
			true,
		)
	})
})

describe('isStepComplete — never completes review or unknown keys', () => {
	test.each(['review', 'nonsense', ''])('%s is never complete', (stepKey) => {
		expect(
			isStepComplete('i765', 'renewal', stepKey, { personFacts: validPersonFacts, form: {} }),
		).toBe(false)
	})
})
