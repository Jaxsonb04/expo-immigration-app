import { describe, expect, test } from 'vitest'
import {
	emptyInterviewValues,
	fieldValidators,
	initialStepIndex,
	preReviewStepKeys,
	seedFromDraft,
	stepDescriptorsFor,
	type InterviewValues,
	type StepData,
} from './interview.form'

// The metadata layer is pure (no React Native), so the contract between the
// wizard and the server — step keys, save payload slices, validators — is
// tested here without a component harness.

describe('step descriptors', () => {
	test.each(['i765', 'i90'] as const)(
		'%s descriptors match the shared pre-Review blueprint, in order',
		(formType) => {
			const keys = stepDescriptorsFor(formType).map((step) => step.key)
			expect(keys).toEqual([...preReviewStepKeys(formType)])
		},
	)

	test('every descriptor carries question copy, help, and at least one field path', () => {
		for (const formType of ['i765', 'i90'] as const) {
			for (const step of stepDescriptorsFor(formType)) {
				expect(step.question.length).toBeGreaterThan(0)
				expect(step.help.length).toBeGreaterThan(0)
				expect(step.fieldPaths.length).toBeGreaterThan(0)
			}
		}
	})
})

describe('seedFromDraft', () => {
	test('fills missing answers with controlled empty strings', () => {
		const values = seedFromDraft({ personFacts: {}, form: {} })
		expect(values).toEqual(emptyInterviewValues)
	})

	test('round-trips persisted answers into form values', () => {
		const values = seedFromDraft({
			personFacts: {
				givenName: 'Maria',
				familyName: 'Santos',
				dateOfBirth: '1990-04-12',
				mailingAddress: { street: '2350 Mission St', city: 'SF', state: 'CA', zipCode: '94110' },
			},
			form: { replacementReason: 'lost' },
		})
		expect(values.personFacts.givenName).toBe('Maria')
		expect(values.personFacts.dateOfBirth).toBe('1990-04-12')
		expect(values.personFacts.mailingAddress.street).toBe('2350 Mission St')
		expect(values.personFacts.mailingAddress.unit).toBe('')
		expect(values.form.replacementReason).toBe('lost')
	})
})

function filledValues(overrides?: Partial<InterviewValues['personFacts']>): InterviewValues {
	return {
		personFacts: {
			givenName: 'Maria',
			middleName: '',
			familyName: 'Santos',
			dateOfBirth: '1990-04-12',
			countryOfBirth: 'Mexico',
			aNumber: '012345678',
			mailingAddress: { street: '2350 Mission St', unit: '', city: 'SF', state: 'CA', zipCode: '94110' },
			eligibilityCategory: 'C09',
			...overrides,
		},
		form: {
			previousEadCardNumber: '',
			replacementReason: 'lost',
			ssn: '',
			cardExpirationDate: '',
		},
	}
}

function stepDataFor(formType: 'i765' | 'i90', key: string, values: InterviewValues, kind: 'initial' | 'renewal' | 'replacement'): StepData {
	const step = stepDescriptorsFor(formType).find((s) => s.key === key)
	if (step === undefined) throw new Error(`no step ${key}`)
	return step.buildStepData(values, kind)
}

describe('buildStepData', () => {
	test('legal-name omits an empty middle name', () => {
		const data = stepDataFor('i765', 'legal-name', filledValues(), 'renewal')
		expect(data.personFacts).toEqual({ givenName: 'Maria', familyName: 'Santos' })
	})

	test('a-number omits an empty value (initial applicants may not have one)', () => {
		const data = stepDataFor('i765', 'a-number', filledValues({ aNumber: '' }), 'initial')
		expect(data.personFacts).toEqual({})
	})

	test('mailing-address emits the full address and drops an empty unit', () => {
		const data = stepDataFor('i765', 'mailing-address', filledValues(), 'renewal')
		expect(data.personFacts?.mailingAddress).toEqual({
			street: '2350 Mission St',
			city: 'SF',
			state: 'CA',
			zipCode: '94110',
		})
	})

	test('eligibility-category includes the replacement reason only for replacements', () => {
		const renewal = stepDataFor('i765', 'eligibility-category', filledValues(), 'renewal')
		expect(renewal.form).toEqual({})
		const replacement = stepDataFor('i765', 'eligibility-category', filledValues(), 'replacement')
		expect(replacement.form).toEqual({ replacementReason: 'lost' })
	})

	test('card-details drops empty expiration and includes reason for replacements', () => {
		const values = filledValues()
		values.form.cardExpirationDate = ''
		const data = stepDataFor('i90', 'card-details', values, 'replacement')
		expect(data.form).toEqual({ replacementReason: 'lost' })
	})

	test('every step payload survives a Zod round-trip through the shared draft shapes', async () => {
		const { i765DraftAnswersShape, i90DraftAnswersShape } = await import(
			'@convex/shared/applicationShapes'
		)
		for (const [formType, shape] of [
			['i765', i765DraftAnswersShape],
			['i90', i90DraftAnswersShape],
		] as const) {
			for (const step of stepDescriptorsFor(formType)) {
				const data = step.buildStepData(filledValues(), 'replacement')
				const parsed = shape.safeParse({
					personFacts: data.personFacts ?? {},
					form: data.form ?? {},
				})
				expect(parsed.success, `${formType}/${step.key}: ${JSON.stringify(parsed.error?.issues)}`).toBe(
					true,
				)
			}
		}
	})
})

describe('field validators', () => {
	test('aNumber is required unless the application is initial', () => {
		expect(fieldValidators.aNumber('renewal').safeParse('').success).toBe(false)
		expect(fieldValidators.aNumber('renewal').safeParse('012345678').success).toBe(true)
		expect(fieldValidators.aNumber('initial').safeParse('').success).toBe(true)
		expect(fieldValidators.aNumber('initial').safeParse('12AB').success).toBe(false)
	})

	test('replacementReason is required only for replacements', () => {
		expect(fieldValidators.replacementReason('replacement').safeParse('').success).toBe(false)
		expect(fieldValidators.replacementReason('replacement').safeParse('lost').success).toBe(true)
		expect(fieldValidators.replacementReason('renewal').safeParse('').success).toBe(true)
	})

	test('dateOfBirth rejects malformed dates and accepts ISO dates', () => {
		expect(fieldValidators.dateOfBirth.safeParse('not-a-date').success).toBe(false)
		expect(fieldValidators.dateOfBirth.safeParse('').success).toBe(false)
		expect(fieldValidators.dateOfBirth.safeParse('1990-04-12').success).toBe(true)
	})

	test('cardExpirationDate is optional but must be a date when present', () => {
		expect(fieldValidators.cardExpirationDate.safeParse('').success).toBe(true)
		expect(fieldValidators.cardExpirationDate.safeParse('2033-01-01').success).toBe(true)
		expect(fieldValidators.cardExpirationDate.safeParse('soon').success).toBe(false)
	})
})

describe('initialStepIndex', () => {
	test('resumes at the persisted current step', () => {
		expect(initialStepIndex('i765', 'mailing-address')).toBe(4)
	})

	test('falls back to the first step for review or unknown keys', () => {
		expect(initialStepIndex('i765', 'review')).toBe(0)
		expect(initialStepIndex('i90', undefined)).toBe(0)
	})
})
