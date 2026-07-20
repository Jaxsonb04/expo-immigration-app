import { describe, expect, test } from 'vitest'
import { supportedSituations } from './applicationShapes'
import { preReviewStepKeys } from './interviewSteps'
import { computeReadiness, formCoverageGaps } from './readiness'

// Workflow-truth tests for the readiness contract: readiness must be derived
// from the persisted data itself, and must fail closed while the app's own
// field contract is incomplete.

const completeI765Answers = {
	personFacts: {
		givenName: 'Maria',
		familyName: 'Santos',
		dateOfBirth: '1990-01-05',
		countryOfBirth: 'Mexico',
		cityOfBirth: 'Oaxaca',
		countryOfCitizenship: 'Mexico',
		daytimePhone: '4155550123',
		aNumber: '12345678',
		mailingAddress: {
			street: '2350 Mission St',
			city: 'San Francisco',
			state: 'CA',
			zipCode: '94110',
		},
		eligibilityCategory: 'C08',
		gender: 'female' as const,
		maritalStatus: 'single' as const,
	},
	form: { previouslyFiledI765: 'no' as const, preparedSelfInEnglish: 'yes' as const },
}

const attachedSlots = [
	{ requirementKey: 'eadCard', status: 'attached' as const },
	{ requirementKey: 'passportPhoto', status: 'attached' as const },
]

describe('computeReadiness — answers blockers', () => {
	test('an empty draft reports one answers blocker per pre-Review step', () => {
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: { personFacts: {}, form: {} },
			requirements: [],
		})
		const answerKeys = readiness.blockers
			.filter((blocker) => blocker.kind === 'answers')
			.map((blocker) => blocker.stepKey)
		expect(answerKeys).toEqual([...preReviewStepKeys('i765')])
		expect(readiness.answersComplete).toBe(false)
		expect(readiness.isReadyToFile).toBe(false)
	})

	test('a complete draft has no answers blockers', () => {
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: completeI765Answers,
			requirements: attachedSlots,
		})
		expect(readiness.answersComplete).toBe(true)
		expect(readiness.blockers.filter((blocker) => blocker.kind === 'answers')).toEqual([])
	})

	test('A-Number stays optional for a first work permit but blocks a renewal', () => {
		const { aNumber: _dropped, ...withoutANumber } = completeI765Answers.personFacts
		const answers = { personFacts: withoutANumber, form: {} }
		const initial = computeReadiness({
			formType: 'i765',
			applicationKind: 'initial',
			answers,
			requirements: [],
		})
		expect(initial.blockers.some((b) => b.kind === 'answers' && b.stepKey === 'a-number')).toBe(
			false,
		)
		const renewal = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers,
			requirements: [],
		})
		expect(renewal.blockers.some((b) => b.kind === 'answers' && b.stepKey === 'a-number')).toBe(
			true,
		)
	})
})

describe('computeReadiness — document blockers', () => {
	test('every needed slot is a blocker; attached and waived are not', () => {
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: completeI765Answers,
			requirements: [
				{ requirementKey: 'eadCard', status: 'needed' },
				{ requirementKey: 'passportPhoto', status: 'attached' },
				{ requirementKey: 'passport', status: 'waived' },
			],
		})
		expect(readiness.documentsComplete).toBe(false)
		expect(readiness.blockers.filter((blocker) => blocker.kind === 'document')).toEqual([
			{ kind: 'document', requirementKey: 'eadCard' },
		])
	})
})

// Every pre-Review i90 answer, valid — the fixture that must reach
// isReadyToFile once documents are attached (slice 3c milestone).
const completeI90Answers = {
	personFacts: {
		givenName: 'Maria',
		familyName: 'Santos',
		dateOfBirth: '1990-01-05',
		countryOfBirth: 'Mexico',
		cityOfBirth: 'Oaxaca',
		daytimePhone: '4155550123',
		aNumber: '12345678',
		mailingAddress: {
			street: '2350 Mission St',
			city: 'San Francisco',
			state: 'CA',
			zipCode: '94110',
		},
		gender: 'female' as const,
		motherGivenName: 'Rosa',
		fatherGivenName: 'Miguel',
		classOfAdmission: 'IR1',
		dateOfAdmission: '2015-06-10',
		heightFeet: '5' as const,
		heightInches: '4' as const,
		weightPounds: '130',
		eyeColor: 'brown' as const,
		hairColor: 'black' as const,
		ethnicity: 'hispanicOrLatino' as const,
		races: ['white' as const],
		locationAppliedVisa: 'Ciudad Juarez, Mexico',
		locationIssuedVisa: 'Ciudad Juarez, Mexico',
		becameResidentVia: 'immigrantVisa' as const,
		destinationAtAdmission: 'San Francisco, CA',
		portOfEntryCityState: 'San Ysidro, CA',
		everInProceedings: 'no' as const,
		filedI407OrAbandoned: 'no' as const,
	},
	form: {
		cardStatus: 'permanentResident' as const,
		nameChangedSinceIssuance: 'no' as const,
		physicalAddressSameAsMailing: 'yes' as const,
		preparedSelfInEnglish: 'yes' as const,
		requestingAccommodation: 'no' as const,
	},
}

describe('computeReadiness — coverage', () => {
	test('every I-765 situation stays coverage-blocked (contract incomplete)', () => {
		for (const { formType, applicationKind } of supportedSituations) {
			if (formType !== 'i765') continue
			expect(formCoverageGaps(formType, applicationKind).length).toBeGreaterThan(0)
			const readiness = computeReadiness({
				formType,
				applicationKind,
				answers: completeI765Answers,
				requirements: attachedSlots,
			})
			expect(readiness.formCoverageComplete).toBe(false)
			expect(readiness.isReadyToFile).toBe(false)
		}
	})

	test('the I-90 field contract is complete — coverage no longer blocks', () => {
		expect(formCoverageGaps('i90', 'renewal')).toEqual([])
		expect(formCoverageGaps('i90', 'replacement')).toEqual([])
	})

	test('MILESTONE: a complete I-90 renewal with resolved documents is ready to file', () => {
		const readiness = computeReadiness({
			formType: 'i90',
			applicationKind: 'renewal',
			answers: completeI90Answers,
			requirements: [
				{ requirementKey: 'permanentResidentCard', status: 'attached' },
				{ requirementKey: 'passportPhoto', status: 'attached' },
			],
		})
		expect(readiness.answersComplete).toBe(true)
		expect(readiness.documentsComplete).toBe(true)
		expect(readiness.formCoverageComplete).toBe(true)
		expect(readiness.blockers).toEqual([])
		expect(readiness.isReadyToFile).toBe(true)
	})

	test('an I-90 with a Part 8-requiring answer is NOT ready to file', () => {
		const readiness = computeReadiness({
			formType: 'i90',
			applicationKind: 'renewal',
			answers: {
				...completeI90Answers,
				personFacts: { ...completeI90Answers.personFacts, everInProceedings: 'yes' as const },
			},
			requirements: [
				{ requirementKey: 'permanentResidentCard', status: 'attached' },
				{ requirementKey: 'passportPhoto', status: 'attached' },
			],
		})
		expect(readiness.isReadyToFile).toBe(false)
		expect(
			readiness.blockers.some(
				(blocker) => blocker.kind === 'answers' && blocker.stepKey === 'immigration-history',
			),
		).toBe(true)
	})

	test('complete answers + documents still leave only coverage blockers', () => {
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: completeI765Answers,
			requirements: attachedSlots,
		})
		expect(readiness.answersComplete).toBe(true)
		expect(readiness.documentsComplete).toBe(true)
		expect(readiness.blockers.every((blocker) => blocker.kind === 'coverage')).toBe(true)
		expect(readiness.isReadyToFile).toBe(false)
	})

	test('coverage gaps are kind-independent and never claim closed items', () => {
		expect(formCoverageGaps('i765', 'replacement')).toEqual(formCoverageGaps('i765', 'renewal'))
		expect(formCoverageGaps('i90', 'replacement')).toEqual(formCoverageGaps('i90', 'renewal'))
		// Slice 3a closed the identity/contact gaps; the lists must not still
		// name them (that would falsely block a completed contract).
		for (const formType of ['i765', 'i90'] as const) {
			for (const item of formCoverageGaps(formType, 'renewal')) {
				expect(item).not.toMatch(/citizenship|city or town of birth|phone/i)
			}
		}
	})
})
