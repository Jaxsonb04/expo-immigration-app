import { describe, expect, test } from 'vitest'
import { type ApplicationKind, type FormType, supportedSituations } from './applicationShapes'
import { preReviewStepKeys } from './interviewSteps'
import {
	accommodationDetailsApply,
	aNumberRequired,
	immigrantVisaDetailsApply,
	isStepComplete,
	physicalAddressApplies,
	previousNameApplies,
	replacementReasonApplies,
	stepOwnedKeys,
} from './interviewValidation'
import { computeReadiness } from './readiness'
import { buildReviewModel } from './reviewModel'

// The review model must never disagree with the interview (isStepComplete) or
// the server readiness contract (computeReadiness). These tests pin that
// invariant across every (form, kind, conditional-answer) combination.

const mailingAddress = { street: '1 Main St', city: 'Austin', state: 'TX', zipCode: '78701' }

const basePersonFacts = {
	givenName: 'Ana',
	familyName: 'Diaz',
	dateOfBirth: '1990-05-01',
	countryOfBirth: 'Mexico',
	cityOfBirth: 'Oaxaca',
	countryOfCitizenship: 'Mexico',
	daytimePhone: '5125550142',
	aNumber: '123456789',
	mailingAddress,
	eligibilityCategory: 'C08',
	// i90-only person facts
	gender: 'female',
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

function completeFor(formType: FormType, applicationKind: ApplicationKind) {
	const form: Record<string, unknown> = {}
	if (applicationKind === 'replacement') form.replacementReason = 'lost'
	if (formType === 'i90') {
		form.cardStatus = 'permanentResident'
		form.nameChangedSinceIssuance = 'no'
		form.physicalAddressSameAsMailing = 'yes'
		form.preparedSelfInEnglish = 'yes'
		form.requestingAccommodation = 'no'
	}
	return { personFacts: { ...basePersonFacts }, form }
}

/** All three invariants that keep the review model honest, for one group. */
function assertGroupConsistency(
	formType: FormType,
	applicationKind: ApplicationKind,
	answers: { personFacts?: unknown; form?: unknown },
) {
	const model = buildReviewModel(formType, applicationKind, answers)
	const readiness = computeReadiness({ formType, applicationKind, answers, requirements: [] })
	for (const group of model.groups) {
		const server = isStepComplete(formType, applicationKind, group.stepKey, answers)
		// (1) group.complete is the server verdict verbatim.
		expect(group.complete, `${group.stepKey} vs isStepComplete`).toBe(server)
		// (2) matches the readiness answers-blocker set.
		const readinessComplete = !readiness.blockers.some(
			(b) => b.kind === 'answers' && b.stepKey === group.stepKey,
		)
		expect(group.complete, `${group.stepKey} vs readiness`).toBe(readinessComplete)
		// (3) matches the rows' own status + blocker.
		const rowsClean = group.rows.every(
			(r) => r.status === 'ok' || r.status === 'optional-blank',
		)
		expect(group.complete, `${group.stepKey} vs rows/blocker`).toBe(
			rowsClean && group.blocker === undefined,
		)
	}
}

describe('buildReviewModel — group ordering', () => {
	test.each(supportedSituations)(
		'$formType/$applicationKind groups follow the interview blueprint exactly',
		({ formType, applicationKind }) => {
			const model = buildReviewModel(formType, applicationKind, completeFor(formType, applicationKind))
			expect(model.groups.map((g) => g.stepKey)).toEqual([...preReviewStepKeys(formType)])
		},
	)

	test('no answer set adds or removes a group', () => {
		const empty = buildReviewModel('i90', 'renewal', { personFacts: {}, form: {} })
		const full = buildReviewModel('i90', 'renewal', completeFor('i90', 'renewal'))
		expect(empty.groups.map((g) => g.stepKey)).toEqual(full.groups.map((g) => g.stepKey))
	})
})

describe('buildReviewModel — consistency invariant (anti-drift keystone)', () => {
	for (const { formType, applicationKind } of supportedSituations) {
		const complete = completeFor(formType, applicationKind)
		const variants: Record<string, { personFacts?: unknown; form?: unknown }> = {
			empty: { personFacts: {}, form: {} },
			complete,
			partial: { personFacts: { givenName: 'Ana' }, form: {} },
		}
		if (formType === 'i90') {
			variants.adjustmentOfStatus = {
				personFacts: { ...basePersonFacts, becameResidentVia: 'adjustmentOfStatus' },
				form: complete.form,
			}
			variants.proceedingsYes = {
				personFacts: { ...basePersonFacts, everInProceedings: 'yes' },
				form: complete.form,
			}
			variants.i407Yes = {
				personFacts: { ...basePersonFacts, filedI407OrAbandoned: 'yes' },
				form: complete.form,
			}
			variants.nameChanged = {
				personFacts: { ...basePersonFacts },
				form: {
					...complete.form,
					nameChangedSinceIssuance: 'yes',
					previousFamilyName: 'Santos',
					previousGivenName: 'Ana',
				},
			}
			variants.nameChangedMissing = {
				personFacts: { ...basePersonFacts },
				form: { ...complete.form, nameChangedSinceIssuance: 'yes' },
			}
			variants.physicalDifferentUs = {
				personFacts: { ...basePersonFacts },
				form: {
					...complete.form,
					physicalAddressSameAsMailing: 'no',
					physicalAddress: { street: '9 Elm St', city: 'Reno', state: 'NV', zipCode: '89501' },
				},
			}
			variants.physicalDifferentForeign = {
				personFacts: { ...basePersonFacts },
				form: {
					...complete.form,
					physicalAddressSameAsMailing: 'no',
					physicalAddress: { street: '1 Calle Real', city: 'Tijuana', country: 'Mexico' },
				},
			}
			variants.physicalDifferentIncomplete = {
				personFacts: { ...basePersonFacts },
				form: {
					...complete.form,
					physicalAddressSameAsMailing: 'no',
					physicalAddress: { street: '9 Elm St', city: 'Reno', state: 'ZZ' },
				},
			}
			variants.conditionalRenewal = {
				personFacts: { ...basePersonFacts },
				form: { ...complete.form, cardStatus: 'conditionalResident' },
			}
			variants.interpreter = {
				personFacts: { ...basePersonFacts },
				form: { ...complete.form, preparedSelfInEnglish: 'no' },
			}
			variants.accommodationNoDetail = {
				personFacts: { ...basePersonFacts },
				form: { ...complete.form, requestingAccommodation: 'yes' },
			}
			variants.accommodationWithDetail = {
				personFacts: { ...basePersonFacts },
				form: {
					...complete.form,
					requestingAccommodation: 'yes',
					accommodationBlindDetail: 'Large-print notices',
				},
			}
		} else {
			variants.notListed = {
				personFacts: { ...basePersonFacts, eligibilityCategory: 'notListed' },
				form: complete.form,
			}
			variants.initialNoANumber = {
				personFacts: { ...basePersonFacts, aNumber: '' },
				form: complete.form,
			}
		}
		for (const [name, answers] of Object.entries(variants)) {
			test(`${formType}/${applicationKind} — ${name}`, () => {
				assertGroupConsistency(formType, applicationKind, answers)
			})
		}
	}
})

describe('buildReviewModel — rows mirror stepOwnedKeys', () => {
	test.each(supportedSituations)(
		'$formType/$applicationKind maximal answers → rows are a subset of owned keys, all applicable present',
		({ formType, applicationKind }) => {
			// Maximal: every conditional turned on, so every owned key is applicable.
			const maximal = {
				personFacts: { ...basePersonFacts, becameResidentVia: 'immigrantVisa' },
				form: {
					...completeFor(formType, applicationKind).form,
					replacementReason: 'lost',
					nameChangedSinceIssuance: 'yes',
					previousFamilyName: 'Santos',
					previousGivenName: 'Ana',
					previousMiddleName: 'Q',
					physicalAddressSameAsMailing: 'no',
					physicalAddress: { street: '9 Elm St', city: 'Reno', state: 'NV', zipCode: '89501' },
					requestingAccommodation: 'yes',
					accommodationBlindDetail: 'Large-print notices',
				},
			}
			const model = buildReviewModel(formType, applicationKind, maximal)
			for (const group of model.groups) {
				const owned = new Set([
					...stepOwnedKeys[group.stepKey]!.personFacts,
					...stepOwnedKeys[group.stepKey]!.form,
				])
				for (const row of group.rows) {
					expect(owned.has(row.key), `${group.stepKey}.${row.key} is an owned key`).toBe(true)
				}
			}
		},
	)
})

describe('buildReviewModel — row applicability and status', () => {
	test('i765 initial: a-number is optional-blank when absent, invalid when malformed', () => {
		const blank = buildReviewModel('i765', 'initial', {
			personFacts: { ...basePersonFacts, aNumber: '' },
			form: {},
		})
		const aRow = blank.groups.find((g) => g.stepKey === 'a-number')!.rows[0]!
		expect(aRow.required).toBe(false)
		expect(aRow.status).toBe('optional-blank')

		const bad = buildReviewModel('i765', 'renewal', {
			personFacts: { ...basePersonFacts, aNumber: '12' },
			form: {},
		})
		const bRow = bad.groups.find((g) => g.stepKey === 'a-number')!.rows[0]!
		expect(bRow.required).toBe(true)
		expect(bRow.status).toBe('invalid')
	})

	test('country-of-birth: state/province is an optional row on both forms', () => {
		for (const formType of ['i765', 'i90'] as const) {
			const model = buildReviewModel(formType, 'renewal', {
				personFacts: { ...basePersonFacts, stateProvinceOfBirth: '' },
				form: completeFor(formType, 'renewal').form,
			})
			const row = model.groups
				.find((g) => g.stepKey === 'country-of-birth')!
				.rows.find((r) => r.key === 'stateProvinceOfBirth')!
			expect(row.required).toBe(false)
			expect(row.status).toBe('optional-blank')
		}
	})

	test('i765 mailing-address shows only the mailingAddress row (no physical fields)', () => {
		const model = buildReviewModel('i765', 'renewal', completeFor('i765', 'renewal'))
		const rows = model.groups.find((g) => g.stepKey === 'mailing-address')!.rows
		expect(rows.map((r) => r.key)).toEqual(['mailingAddress'])
	})

	test('i90 mailing-address: physicalAddress row appears only when different', () => {
		const same = buildReviewModel('i90', 'renewal', completeFor('i90', 'renewal'))
		expect(
			same.groups.find((g) => g.stepKey === 'mailing-address')!.rows.map((r) => r.key),
		).toEqual(['mailingAddress', 'physicalAddressSameAsMailing'])

		const different = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts },
			form: {
				...completeFor('i90', 'renewal').form,
				physicalAddressSameAsMailing: 'no',
				physicalAddress: { street: '9 Elm St', city: 'Reno', state: 'NV', zipCode: '89501' },
			},
		})
		expect(
			different.groups.find((g) => g.stepKey === 'mailing-address')!.rows.map((r) => r.key),
		).toContain('physicalAddress')
	})

	test('immigration-history: entry-detail rows appear only for immigrant-visa entries', () => {
		const visa = buildReviewModel('i90', 'renewal', completeFor('i90', 'renewal'))
		const visaKeys = visa.groups.find((g) => g.stepKey === 'immigration-history')!.rows.map((r) => r.key)
		expect(visaKeys).toContain('destinationAtAdmission')

		const adjustment = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts, becameResidentVia: 'adjustmentOfStatus' },
			form: completeFor('i90', 'renewal').form,
		})
		const adjKeys = adjustment.groups
			.find((g) => g.stepKey === 'immigration-history')!
			.rows.map((r) => r.key)
		expect(adjKeys).not.toContain('destinationAtAdmission')
		expect(adjKeys).not.toContain('portOfEntryCityState')
	})
})

describe('buildReviewModel — group blockers', () => {
	test('proceedings / I-407 "yes" → proceedings-need-explanation, group incomplete', () => {
		const model = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts, everInProceedings: 'yes' },
			form: completeFor('i90', 'renewal').form,
		})
		const group = model.groups.find((g) => g.stepKey === 'immigration-history')!
		expect(group.blocker).toBe('proceedings-need-explanation')
		expect(group.complete).toBe(false)
	})

	test('unsupported eligibility category → category-unsupported (blank category → no blocker)', () => {
		const notListed = buildReviewModel('i765', 'renewal', {
			personFacts: { ...basePersonFacts, eligibilityCategory: 'notListed' },
			form: {},
		})
		expect(
			notListed.groups.find((g) => g.stepKey === 'eligibility-category')!.blocker,
		).toBe('category-unsupported')

		const blank = buildReviewModel('i765', 'renewal', {
			personFacts: { ...basePersonFacts, eligibilityCategory: '' },
			form: {},
		})
		const blankGroup = blank.groups.find((g) => g.stepKey === 'eligibility-category')!
		expect(blankGroup.blocker).toBeUndefined()
		expect(blankGroup.rows.find((r) => r.key === 'eligibilityCategory')!.status).toBe('missing')
	})

	test('conditional resident + renewal → card-not-eligible', () => {
		const model = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts },
			form: { ...completeFor('i90', 'renewal').form, cardStatus: 'conditionalResident' },
		})
		expect(model.groups.find((g) => g.stepKey === 'card-details')!.blocker).toBe('card-not-eligible')
	})

	test('a value-based blocker marks its own row "blocked" (not a plain ok)', () => {
		const notListed = buildReviewModel('i765', 'renewal', {
			personFacts: { ...basePersonFacts, eligibilityCategory: 'notListed' },
			form: {},
		})
		const catRow = notListed.groups
			.find((g) => g.stepKey === 'eligibility-category')!
			.rows.find((r) => r.key === 'eligibilityCategory')!
		expect(catRow.status).toBe('blocked')

		const conditional = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts },
			form: { ...completeFor('i90', 'renewal').form, cardStatus: 'conditionalResident' },
		})
		expect(
			conditional.groups
				.find((g) => g.stepKey === 'card-details')!
				.rows.find((r) => r.key === 'cardStatus')!.status,
		).toBe('blocked')

		const proceedings = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts, everInProceedings: 'yes' },
			form: completeFor('i90', 'renewal').form,
		})
		const historyRows = proceedings.groups.find((g) => g.stepKey === 'immigration-history')!.rows
		expect(historyRows.find((r) => r.key === 'everInProceedings')!.status).toBe('blocked')
		// The other Yes/No answer here is 'no' and must stay a normal ok row.
		expect(historyRows.find((r) => r.key === 'filedI407OrAbandoned')!.status).toBe('ok')
	})

	test('non-English preparation → needs-preparer-parts; requested accommodation with no detail → accommodation-detail-missing', () => {
		const interpreter = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts },
			form: { ...completeFor('i90', 'renewal').form, preparedSelfInEnglish: 'no' },
		})
		expect(interpreter.groups.find((g) => g.stepKey === 'applicant-statement')!.blocker).toBe(
			'needs-preparer-parts',
		)

		const noDetail = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts },
			form: { ...completeFor('i90', 'renewal').form, requestingAccommodation: 'yes' },
		})
		expect(noDetail.groups.find((g) => g.stepKey === 'applicant-statement')!.blocker).toBe(
			'accommodation-detail-missing',
		)
	})
})

describe('buildReviewModel — documents', () => {
	test('documentKeys match requiredSlotKeys; name change appends nameChangeEvidence', () => {
		const base = buildReviewModel('i90', 'renewal', completeFor('i90', 'renewal'))
		expect(base.documentKeys).not.toContain('nameChangeEvidence')

		const changed = buildReviewModel('i90', 'renewal', {
			personFacts: { ...basePersonFacts },
			form: {
				...completeFor('i90', 'renewal').form,
				nameChangedSinceIssuance: 'yes',
				previousFamilyName: 'Santos',
				previousGivenName: 'Ana',
			},
		})
		expect(changed.documentKeys).toContain('nameChangeEvidence')
	})
})

describe('applicability predicates (extracted from isStepComplete)', () => {
	test('aNumberRequired is false only for i765 initial', () => {
		expect(aNumberRequired('i765', 'initial')).toBe(false)
		expect(aNumberRequired('i765', 'renewal')).toBe(true)
		expect(aNumberRequired('i90', 'renewal')).toBe(true)
	})
	test('conditional predicates gate on their single answer', () => {
		expect(physicalAddressApplies({ physicalAddressSameAsMailing: 'no' })).toBe(true)
		expect(physicalAddressApplies({ physicalAddressSameAsMailing: 'yes' })).toBe(false)
		expect(immigrantVisaDetailsApply({ becameResidentVia: 'immigrantVisa' })).toBe(true)
		expect(immigrantVisaDetailsApply({ becameResidentVia: 'adjustmentOfStatus' })).toBe(false)
		expect(previousNameApplies({ nameChangedSinceIssuance: 'yes' })).toBe(true)
		expect(previousNameApplies({ nameChangedSinceIssuance: 'no' })).toBe(false)
		expect(replacementReasonApplies('replacement')).toBe(true)
		expect(replacementReasonApplies('renewal')).toBe(false)
		expect(accommodationDetailsApply({ requestingAccommodation: 'yes' })).toBe(true)
		expect(accommodationDetailsApply({ requestingAccommodation: 'no' })).toBe(false)
	})
})
