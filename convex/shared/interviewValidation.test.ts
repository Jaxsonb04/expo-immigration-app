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
	aNumber: '123456789',
	mailingAddress: { street: '1 Main St', city: 'Austin', state: 'TX', zipCode: '78701' },
	eligibilityCategory: 'C08',
}

const formFor = (situation: { formType: string; applicationKind: string }) =>
	situation.applicationKind === 'replacement' ? { replacementReason: 'lost' } : {}

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
				personFacts: { ...validPersonFacts, mailingAddress: { street: '1 Main St', city: 'Austin', state: '', zipCode: '78701' } },
				form: {},
			}),
		).toBe(false)
	})

	test('middleName is optional — blank still completes legal-name', () => {
		expect(isStepComplete('i90', 'renewal', 'legal-name', answers({ middleName: '' }))).toBe(true)
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
		const noReason = { personFacts: validPersonFacts, form: {} }
		const withReason = { personFacts: validPersonFacts, form: { replacementReason: 'lost' } }
		// i765 final step (eligibility-category)
		expect(isStepComplete('i765', 'renewal', 'eligibility-category', noReason)).toBe(true)
		expect(isStepComplete('i765', 'replacement', 'eligibility-category', noReason)).toBe(false)
		expect(isStepComplete('i765', 'replacement', 'eligibility-category', withReason)).toBe(true)
		// i90 final step (card-details) — vacuous for renewal, reason-gated for replacement
		expect(isStepComplete('i90', 'renewal', 'card-details', { personFacts: validPersonFacts, form: {} })).toBe(true)
		expect(isStepComplete('i90', 'replacement', 'card-details', noReason)).toBe(false)
		expect(isStepComplete('i90', 'replacement', 'card-details', withReason)).toBe(true)
	})

	test('i765 eligibility-category needs a category', () => {
		expect(
			isStepComplete('i765', 'renewal', 'eligibility-category', {
				personFacts: { ...validPersonFacts, eligibilityCategory: '' },
				form: {},
			}),
		).toBe(false)
	})
})

describe('isStepComplete — never completes review or unknown keys', () => {
	test.each(['review', 'nonsense', ''])('%s is never complete', (stepKey) => {
		expect(isStepComplete('i765', 'renewal', stepKey, { personFacts: validPersonFacts, form: {} })).toBe(
			false,
		)
	})
})
