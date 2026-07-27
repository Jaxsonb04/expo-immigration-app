import { describe, expect, test } from 'vitest'
import { requiredSlotKeys } from './interviewSteps'

describe('requiredSlotKeys — current USCIS evidence rules', () => {
	test('I-765 uses an entry-document alternative instead of universally requiring Form I-94', () => {
		const pendingAsylum = requiredSlotKeys('i765', 'initial', {
			personFacts: { eligibilityCategory: 'C08' },
			form: {},
		})
		expect(pendingAsylum).toContain('entryDocument')
		expect(pendingAsylum).not.toContain('i94')

		const adjustmentApplicant = requiredSlotKeys('i765', 'initial', {
			personFacts: { eligibilityCategory: 'C09' },
			form: {},
		})
		expect(adjustmentApplicant).not.toContain('entryDocument')
		expect(adjustmentApplicant).not.toContain('i94')
	})

	test('every supported I-765 category contributes its own evidence requirements', () => {
		const expectedByCategory: Record<string, readonly string[]> = {
			C08: ['pendingAsylumEvidence'],
			C09: ['pendingI485Evidence'],
			C10: ['cancellationProceedingsEvidence'],
			C33: ['formI821D', 'formI765WS'],
			A05: ['asyleeStatusEvidence'],
			A03: ['refugeeStatusEvidence'],
			A17: ['applicantEStatusEvidence', 'spouseEStatusEvidence', 'marriageCertificate'],
			C26: ['h4StatusEvidence', 'marriageCertificate', 'h1bSpouseEligibilityEvidence'],
		}

		for (const [eligibilityCategory, expected] of Object.entries(expectedByCategory)) {
			const keys = requiredSlotKeys('i765', 'renewal', {
				personFacts: { eligibilityCategory },
				form: {},
			})
			for (const key of expected) {
				expect(keys, `${eligibilityCategory} is missing ${key}`).toContain(key)
			}
		}
	})

	test('I-90 evidence follows the selected renewal or replacement reason and never adds photos', () => {
		expect(
			requiredSlotKeys('i90', 'renewal', {
				form: { cardStatus: 'permanentResident', nameChangedSinceIssuance: 'no' },
			}),
		).toEqual(['permanentResidentCard'])

		const expectedByReason: Record<string, readonly string[]> = {
			lost: ['permanentResidentCardOrGovernmentId'],
			stolen: ['permanentResidentCardOrGovernmentId'],
			destroyed: ['permanentResidentCardOrGovernmentId'],
			damaged: ['permanentResidentCardOrGovernmentId'],
			error: ['originalIncorrectPermanentResidentCard', 'correctBiographicEvidence'],
			nameChange: ['nameChangeEvidence'],
		}
		for (const [replacementReason, expected] of Object.entries(expectedByReason)) {
			const keys = requiredSlotKeys('i90', 'replacement', {
				form: {
					cardStatus: 'permanentResident',
					replacementReason,
					nameChangedSinceIssuance: replacementReason === 'nameChange' ? 'yes' : 'no',
				},
			})
			expect(keys).toEqual(expected)
			expect(keys).not.toContain('passportPhoto')
		}
	})

	test('I-765 general evidence follows kind, category exemptions, and conditional answers', () => {
		expect(
			requiredSlotKeys('i765', 'initial', {
				personFacts: { eligibilityCategory: 'C08', hasUsedOtherNames: 'no' },
				form: {},
			}),
		).toEqual(['passportPhoto', 'entryDocument', 'identityEvidence', 'pendingAsylumEvidence'])

		expect(
			requiredSlotKeys('i765', 'renewal', {
				personFacts: { eligibilityCategory: 'C09', hasUsedOtherNames: 'yes' },
				form: {},
			}),
		).toEqual(['eadCard', 'passportPhoto', 'pendingI485Evidence', 'otherNamesEvidence'])

		expect(
			requiredSlotKeys('i765', 'replacement', {
				personFacts: { eligibilityCategory: 'C33', hasUsedOtherNames: 'no' },
				form: { replacementReason: 'lost' },
			}),
		).toEqual(['passportPhoto', 'entryDocument', 'currentDacaEvidence', 'identityEvidence'])

		expect(
			requiredSlotKeys('i765', 'replacement', {
				personFacts: { eligibilityCategory: 'A05', hasUsedOtherNames: 'no' },
				form: { replacementReason: 'damaged' },
			}),
		).toContain('eadCard')

		const incorrectCard = requiredSlotKeys('i765', 'replacement', {
			personFacts: { eligibilityCategory: 'A05', hasUsedOtherNames: 'no' },
			form: { replacementReason: 'error' },
		})
		expect(incorrectCard).toContain('originalIncorrectEad')
		expect(incorrectCard).toContain('correctBiographicEvidence')
		expect(incorrectCard).not.toContain('eadCard')
	})

	test('(c)(8) arrest records apply to initial and renewal filings, not replacement', () => {
		for (const applicationKind of ['initial', 'renewal'] as const) {
			expect(
				requiredSlotKeys('i765', applicationKind, {
					personFacts: { eligibilityCategory: 'C08' },
					form: { c8EverArrestedOrConvicted: 'yes' },
				}),
			).toContain('courtDispositions')
		}
		expect(
			requiredSlotKeys('i765', 'replacement', {
				personFacts: { eligibilityCategory: 'C08' },
				form: { replacementReason: 'lost', c8EverArrestedOrConvicted: 'yes' },
			}),
		).not.toContain('courtDispositions')
	})
})
