import { describe, expect, test } from 'vitest'
import type { ApplicationKind, FormType } from './applicationShapes'
import { supportedSituations } from './applicationShapes'
import { EVIDENCE_CONTRACT_VERSION, evidenceRequirementFor } from './evidenceRequirements'
import { preReviewStepKeys, requiredSlotKeys } from './interviewSteps'
import { computeReadiness, formCoverageGaps, isRequirementSatisfied } from './readiness'

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
		hasUsedOtherNames: 'no' as const,
		dateOfLastEntry: '2019-08-14',
		placeOfLastEntry: 'JFK Airport, New York',
		statusAtLastEntry: 'F-1 student',
		currentImmigrationStatus: 'Pending asylum applicant',
		usedTravelDocument: 'yes' as const,
		passportNumber: 'G12345678',
		travelDocCountryOfIssuance: 'Mexico',
		travelDocExpirationDate: '2026-01-01',
	},
	form: {
		previouslyFiledI765: 'no' as const,
		preparedSelfInEnglish: 'yes' as const,
		physicalAddressSameAsMailing: 'yes' as const,
		c8EverArrestedOrConvicted: 'no' as const,
	},
}

function confirmedRequirements(
	formType: FormType,
	applicationKind: ApplicationKind,
	answers: { personFacts?: unknown; form?: unknown },
) {
	return requiredSlotKeys(formType, applicationKind, answers).map((requirementKey) => {
		const requirement = evidenceRequirementFor(requirementKey)!
		if (requirement.fulfillment === 'physical') {
			return {
				requirementKey,
				status: 'confirmed' as const,
				confirmationVersion: EVIDENCE_CONTRACT_VERSION,
				confirmationRevision: 0,
				evidenceRevision: 0,
			}
		}
		const documentId = `${requirementKey}-v1`
		return {
			requirementKey,
			status: 'attached' as const,
			documentId,
			confirmedDocumentId: documentId,
			confirmationVersion: EVIDENCE_CONTRACT_VERSION,
			confirmationRevision: 0,
			evidenceRevision: 0,
			documentType: requirement.acceptedDocumentTypes[0]!,
			documentIsCurrent: true,
			documentMatchesApplicant: true,
		}
	})
}

const attachedSlots = confirmedRequirements('i765', 'renewal', completeI765Answers)

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
	test('missing expected requirement rows fail closed', () => {
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: completeI765Answers,
			requirements: [],
		})
		expect(readiness.documentsComplete).toBe(false)
		expect(readiness.blockers.filter((blocker) => blocker.kind === 'document')).toEqual([
			{ kind: 'document', requirementKey: 'eadCard' },
			{ kind: 'document', requirementKey: 'passportPhoto' },
			{ kind: 'document', requirementKey: 'entryDocument' },
			{ kind: 'document', requirementKey: 'pendingAsylumEvidence' },
		])
	})

	test('an attached file is still blocked until the user confirms the exact version', () => {
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: completeI765Answers,
			requirements: [
				{
					requirementKey: 'eadCard',
					status: 'attached',
					documentId: 'ead-v1',
					documentType: 'ead',
					documentIsCurrent: true,
				},
				{
					requirementKey: 'passportPhoto',
					status: 'confirmed',
					confirmationVersion: 'uscis-evidence-2026-07-25',
					confirmationRevision: 0,
				},
				{
					requirementKey: 'entryDocument',
					status: 'attached',
					documentId: 'passport-v1',
					confirmedDocumentId: 'passport-v1',
					confirmationVersion: 'uscis-evidence-2026-07-25',
					confirmationRevision: 0,
					documentType: 'passport',
					documentIsCurrent: true,
					documentMatchesApplicant: true,
				},
				{
					requirementKey: 'pendingAsylumEvidence',
					status: 'attached',
					documentId: 'asylum-v1',
					confirmedDocumentId: 'asylum-v1',
					confirmationVersion: 'uscis-evidence-2026-07-25',
					confirmationRevision: 0,
					documentType: 'other',
					documentIsCurrent: true,
					documentMatchesApplicant: true,
				},
			],
		})
		expect(readiness.documentsComplete).toBe(false)
		expect(readiness.blockers.filter((blocker) => blocker.kind === 'document')).toEqual([
			{ kind: 'document', requirementKey: 'eadCard' },
		])
	})

	test('confirmation fails closed for a missing file, wrong type, stale file, or old checklist', () => {
		const base = {
			requirementKey: 'eadCard',
			status: 'attached' as const,
			documentId: 'ead-v1',
			confirmedDocumentId: 'ead-v1',
			confirmationVersion: 'uscis-evidence-2026-07-25',
			confirmationRevision: 0,
			evidenceRevision: 0,
			documentType: 'ead' as const,
			documentIsCurrent: true,
			documentMatchesApplicant: true,
		}
		expect(isRequirementSatisfied('eadCard', base)).toBe(true)
		expect(isRequirementSatisfied('eadCard', { ...base, documentId: undefined })).toBe(false)
		expect(isRequirementSatisfied('eadCard', { ...base, documentType: 'photo' })).toBe(false)
		expect(isRequirementSatisfied('eadCard', { ...base, documentIsCurrent: false })).toBe(false)
		expect(
			isRequirementSatisfied('eadCard', { ...base, confirmationVersion: 'older-checklist' }),
		).toBe(false)
		expect(isRequirementSatisfied('eadCard', { ...base, evidenceRevision: 1 })).toBe(false)
	})

	test('needed and waived active slots remain blockers', () => {
		const requirements = confirmedRequirements('i765', 'renewal', completeI765Answers).map(
			(slot) =>
				slot.requirementKey === 'eadCard'
					? { requirementKey: slot.requirementKey, status: 'needed' as const }
					: slot.requirementKey === 'entryDocument'
						? { requirementKey: slot.requirementKey, status: 'waived' as const }
						: slot,
		)
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: completeI765Answers,
			requirements,
		})
		expect(readiness.documentsComplete).toBe(false)
		expect(readiness.blockers.filter((blocker) => blocker.kind === 'document')).toEqual([
			{ kind: 'document', requirementKey: 'eadCard' },
			{ kind: 'document', requirementKey: 'entryDocument' },
		])
	})

	test('current-contract filings preserve incomplete evidence while legacy filings stay frozen', () => {
		const unconfirmedCard = {
			requirementKey: 'permanentResidentCard',
			status: 'attached' as const,
			documentId: 'card-v1',
			documentType: 'permanentResidentCard' as const,
			documentIsCurrent: true,
			documentMatchesApplicant: true,
			evidenceRevision: 3,
		}
		const current = computeReadiness({
			formType: 'i90',
			applicationKind: 'renewal',
			applicationStatus: 'filed',
			hasFilingRecord: true,
			filingEvidenceContractVersion: EVIDENCE_CONTRACT_VERSION,
			filingRequirementKeys: ['permanentResidentCard'],
			answers: completeI90Answers,
			requirements: [unconfirmedCard],
		})
		expect(current.documentsComplete).toBe(false)
		expect(current.blockers).toContainEqual({
			kind: 'document',
			requirementKey: 'permanentResidentCard',
		})

		const legacy = computeReadiness({
			formType: 'i90',
			applicationKind: 'renewal',
			applicationStatus: 'filed',
			hasFilingRecord: true,
			answers: completeI90Answers,
			requirements: [unconfirmedCard],
		})
		expect(legacy.documentsComplete).toBe(true)
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
		cardExpirationDate: '2020-01-01',
		nameChangedSinceIssuance: 'no' as const,
		physicalAddressSameAsMailing: 'yes' as const,
		preparedSelfInEnglish: 'yes' as const,
		requestingAccommodation: 'no' as const,
	},
}

describe('computeReadiness — coverage', () => {
	test('BOTH field contracts are complete — coverage never blocks any situation', () => {
		for (const { formType, applicationKind } of supportedSituations) {
			expect(formCoverageGaps(formType, applicationKind)).toEqual([])
		}
	})

	test('MILESTONE: a complete I-765 renewal with resolved documents is ready to file', () => {
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: completeI765Answers,
			requirements: attachedSlots,
		})
		expect(readiness.answersComplete).toBe(true)
		expect(readiness.blockers).toEqual([])
		expect(readiness.isReadyToFile).toBe(true)
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
			requirements: confirmedRequirements('i90', 'renewal', completeI90Answers),
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
			requirements: confirmedRequirements('i90', 'renewal', completeI90Answers),
		})
		expect(readiness.isReadyToFile).toBe(false)
		expect(
			readiness.blockers.some(
				(blocker) => blocker.kind === 'answers' && blocker.stepKey === 'immigration-history',
			),
		).toBe(true)
	})

	test('incomplete answers still block a form whose coverage is complete', () => {
		const readiness = computeReadiness({
			formType: 'i765',
			applicationKind: 'renewal',
			answers: { personFacts: {}, form: {} },
			requirements: attachedSlots,
		})
		expect(readiness.answersComplete).toBe(false)
		expect(readiness.formCoverageComplete).toBe(true)
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
