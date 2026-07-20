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
		aNumber: '12345678',
		mailingAddress: {
			street: '2350 Mission St',
			city: 'San Francisco',
			state: 'CA',
			zipCode: '94110',
		},
		eligibilityCategory: 'C08',
	},
	form: {},
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

describe('computeReadiness — coverage fails closed', () => {
	test('no supported situation is fileable while its field contract is incomplete', () => {
		for (const { formType, applicationKind } of supportedSituations) {
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

	test('an I-765 replacement also reports the unwritten replacement reason', () => {
		const gaps = formCoverageGaps('i765', 'replacement')
		expect(gaps.some((item) => item.includes('previous card'))).toBe(true)
		expect(gaps.length).toBe(formCoverageGaps('i765', 'renewal').length + 1)
	})
})
