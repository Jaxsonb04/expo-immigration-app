/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import {
	type ApplicationKind,
	type FormType,
	supportedSituations,
} from './shared/applicationShapes'

const modules = import.meta.glob('./**/*.ts')

function newT() {
	return convexTest(schema, modules)
}

beforeEach(() => {
	vi.stubEnv('DEV_SEED_ENABLED', 'true')
})

const mailingAddress = {
	street: '1 Main St',
	city: 'Oakland',
	state: 'CA',
	zipCode: '94601',
}

describe('applicants', () => {
	test('self applicant is unique per owner (idempotent create)', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })

		const first = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice A',
			isSelf: true,
		})
		const second = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice again',
			isSelf: true,
		})
		expect(second).toBe(first)

		const dependent = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Kid A',
			isSelf: false,
		})
		expect(dependent).not.toBe(first)
		expect(await alice.query(api.applicants.listApplicants, {})).toHaveLength(2)
	})

	test('listApplicants is owner-scoped', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const bob = t.withIdentity({ subject: 'bob' })
		await alice.mutation(api.applicants.createApplicant, { displayName: 'Alice', isSelf: true })
		expect(await bob.query(api.applicants.listApplicants, {})).toHaveLength(0)
	})
})

describe('createApplication', () => {
	test('creates application + autofilled draft + requirement slots', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const applicantId = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice',
			isSelf: true,
		})
		// Simulate a previously promoted profile (ADR-0014 autofill conduit).
		await t.run(async (ctx) => {
			await ctx.db.patch('applicants', applicantId, {
				profile: { givenName: 'Alice', familyName: 'Anders' },
			})
		})

		const applicationId = await alice.mutation(api.applications.createApplication, {
			applicantId,
			formType: 'i765',
			applicationKind: 'renewal',
		})

		const detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.application.status).toBe('draft')
		expect(detail.application.completedStepCount).toBe(0)
		expect(detail.application.totalStepCount).toBe(12)
		expect(detail.application.currentStepKey).toBe('legal-name')
		// Draft seeded from the profile, steps still incomplete.
		expect(detail.draft.answers.personFacts).toMatchObject({
			givenName: 'Alice',
			familyName: 'Anders',
		})
		expect(detail.draft.stepCompletion).toEqual({})
		// Slots materialized from the (i765, renewal) template.
		expect(detail.requirements.map((r) => r.requirementKey).sort()).toEqual([
			'eadCard',
			'passportPhoto',
		])
		expect(detail.requirements.every((r) => r.status === 'needed')).toBe(true)
		// The app is free: a brand-new application with no entitlement rows is
		// already unlocked for the clean export (convex/model/entitlements.ts).
		expect(detail.isUnlocked).toBe(true)
	})

	test('clean export is unlocked for a plain owner who never purchased anything', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const applicantId = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice',
			isSelf: true,
		})
		const applicationId = await alice.mutation(api.applications.createApplication, {
			applicantId,
			formType: 'i765',
			applicationKind: 'renewal',
		})
		// No entitlement row exists and no purchase mutation was ever called —
		// the server still treats the owner as entitled to the clean export.
		const detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.isUnlocked).toBe(true)
	})

	test('rejects unsupported situations (I-90 has no initial)', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const applicantId = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice',
			isSelf: true,
		})
		await expect(
			alice.mutation(api.applications.createApplication, {
				applicantId,
				formType: 'i90',
				applicationKind: 'initial',
			}),
		).rejects.toThrow(/not supported/)
	})

	test('i90 requires a card status and screens out conditional-resident renewal', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const applicantId = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice',
			isSelf: true,
		})
		// No status at all → refused before anything is created.
		await expect(
			alice.mutation(api.applications.createApplication, {
				applicantId,
				formType: 'i90',
				applicationKind: 'renewal',
			}),
		).rejects.toThrow(/what kind of card/)
		// The one blocked combination: conditional resident renewing a 2-year card.
		await expect(
			alice.mutation(api.applications.createApplication, {
				applicantId,
				formType: 'i90',
				applicationKind: 'renewal',
				i90CardStatus: 'conditionalResident',
			}),
		).rejects.toThrow(/I-751/)
		expect(await alice.query(api.applications.listApplications, {})).toHaveLength(0)

		// A conditional-resident REPLACEMENT is supported, and the screened
		// status lands in the draft as a real answer.
		const applicationId = await alice.mutation(api.applications.createApplication, {
			applicantId,
			formType: 'i90',
			applicationKind: 'replacement',
			i90CardStatus: 'conditionalResident',
		})
		const detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.draft.formType).toBe('i90')
		if (detail.draft.formType === 'i90') {
			expect(detail.draft.answers.form.cardStatus).toBe('conditionalResident')
		}
	})

	test("rejects another owner's applicant", async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const bob = t.withIdentity({ subject: 'bob' })
		const applicantId = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice',
			isSelf: true,
		})
		await expect(
			bob.mutation(api.applications.createApplication, {
				applicantId,
				formType: 'i765',
				applicationKind: 'renewal',
			}),
		).rejects.toThrow('Applicant not found')
	})
})

describe('saveApplicationStep', () => {
	async function setup() {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const applicantId = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice',
			isSelf: true,
		})
		const applicationId = await alice.mutation(api.applications.createApplication, {
			applicantId,
			formType: 'i765',
			applicationKind: 'renewal',
		})
		return { t, alice, applicantId, applicationId }
	}

	test('saves answers, marks the step, and advances the summary', async () => {
		const { alice, applicationId } = await setup()

		const result = await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'legal-name',
			stepData: {
				personFacts: { givenName: 'Alice', familyName: 'Anders', hasUsedOtherNames: 'no' },
			},
		})
		expect(result).toEqual({
			nextStepKey: 'date-of-birth',
			completedStepCount: 1,
			totalStepCount: 12,
		})

		const detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.application.currentStepKey).toBe('date-of-birth')
		expect(detail.application.completedStepCount).toBe(1)
		expect(detail.draft.answers.personFacts.givenName).toBe('Alice')
	})

	test('is idempotent for repeated taps', async () => {
		const { alice, applicationId } = await setup()
		const args = {
			applicationId,
			stepKey: 'legal-name',
			stepData: { personFacts: { givenName: 'Alice', familyName: 'Anders' } },
		}
		const first = await alice.mutation(api.applications.saveApplicationStep, args)
		const second = await alice.mutation(api.applications.saveApplicationStep, args)
		expect(second).toEqual(first)
	})

	test('rejects unknown steps, semantic violations, and foreign owners', async () => {
		const { t, alice, applicationId } = await setup()

		await expect(
			alice.mutation(api.applications.saveApplicationStep, {
				applicationId,
				stepKey: 'not-a-step',
				stepData: { personFacts: {} },
			}),
		).rejects.toThrow(/Unknown step/)

		// A-Number format is enforced by the shared Zod shape, not just the
		// storage validator.
		await expect(
			alice.mutation(api.applications.saveApplicationStep, {
				applicationId,
				stepKey: 'a-number',
				stepData: { personFacts: { aNumber: 'ABC' } },
			}),
		).rejects.toThrow(/Invalid answers/)

		const bob = t.withIdentity({ subject: 'bob' })
		await expect(
			bob.mutation(api.applications.saveApplicationStep, {
				applicationId,
				stepKey: 'legal-name',
				stepData: { personFacts: { givenName: 'X' } },
			}),
		).rejects.toThrow('Application not found')
	})

	test('promotes person-facts to the applicant profile at Review-reach', async () => {
		const { t, alice, applicantId, applicationId } = await setup()

		const steps: { stepKey: string; stepData: { personFacts?: object; form?: object } }[] = [
			{
				stepKey: 'legal-name',
				stepData: {
					personFacts: { givenName: 'Alice', familyName: 'Anders', hasUsedOtherNames: 'no' },
				},
			},
			{ stepKey: 'date-of-birth', stepData: { personFacts: { dateOfBirth: '1991-02-03' } } },
			{
				stepKey: 'country-of-birth',
				stepData: { personFacts: { countryOfBirth: 'Brazil', cityOfBirth: 'Salvador' } },
			},
			{ stepKey: 'citizenship', stepData: { personFacts: { countryOfCitizenship: 'Brazil' } } },
			{
				stepKey: 'other-information',
				stepData: {
					personFacts: { gender: 'female', maritalStatus: 'single' },
					form: { previouslyFiledI765: 'no' },
				},
			},
			{
				stepKey: 'last-arrival',
				stepData: {
					personFacts: {
						dateOfLastEntry: '2019-08-14',
						placeOfLastEntry: 'JFK Airport, New York',
						statusAtLastEntry: 'F-1 student',
						currentImmigrationStatus: 'Pending adjustment applicant',
						usedTravelDocument: 'no',
					},
				},
			},
			{ stepKey: 'a-number', stepData: { personFacts: { aNumber: '01234567' } } },
			{
				stepKey: 'mailing-address',
				stepData: {
					personFacts: { mailingAddress },
					form: { physicalAddressSameAsMailing: 'yes' },
				},
			},
			{ stepKey: 'contact-info', stepData: { personFacts: { daytimePhone: '5105550101' } } },
			{
				stepKey: 'eligibility-category',
				stepData: {
					personFacts: { eligibilityCategory: 'C08' },
					form: { c8EverArrestedOrConvicted: 'no' },
				},
			},
		]
		for (const step of steps) {
			await alice.mutation(api.applications.saveApplicationStep, { applicationId, ...step })
			// Profile stays untouched until every pre-Review step is complete.
			const applicant = await t.run((ctx) => ctx.db.get('applicants', applicantId))
			expect(applicant!.profile.givenName).toBeUndefined()
		}

		const result = await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'applicant-statement',
			stepData: { form: { preparedSelfInEnglish: 'yes' } },
		})
		expect(result.nextStepKey).toBe('review')

		const applicant = await t.run((ctx) => ctx.db.get('applicants', applicantId))
		expect(applicant!.profile).toMatchObject({
			givenName: 'Alice',
			familyName: 'Anders',
			dateOfBirth: '1991-02-03',
			countryOfBirth: 'Brazil',
			cityOfBirth: 'Salvador',
			countryOfCitizenship: 'Brazil',
			daytimePhone: '5105550101',
			aNumber: '01234567',
			eligibilityCategory: 'C08',
			gender: 'female',
			maritalStatus: 'single',
		})
	})

	test('does not mark a step complete when required data is missing (server-enforced)', async () => {
		const { alice, applicationId } = await setup()
		// familyName missing — the slice persists, but the step must NOT flip
		// complete, so Review stays locked. The guarantee is server-side, not a
		// client-supplied boolean.
		const result = await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'legal-name',
			stepData: { personFacts: { givenName: 'Alice' } },
		})
		expect(result.completedStepCount).toBe(0)
		expect(result.nextStepKey).toBe('legal-name')
		const detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.draft.answers.personFacts.givenName).toBe('Alice')
		expect(detail.draft.stepCompletion['legal-name']).not.toBe(true)
	})

	test('rejects the review step key so it can never be marked complete', async () => {
		const { alice, applicationId } = await setup()
		await expect(
			alice.mutation(api.applications.saveApplicationStep, {
				applicationId,
				stepKey: 'review',
				stepData: { personFacts: {} },
			}),
		).rejects.toThrow(/Unknown step/)
	})

	test('clears a previously-saved optional field on re-save (no stale retention)', async () => {
		const { alice, applicationId } = await setup()
		await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'legal-name',
			stepData: { personFacts: { givenName: 'Alice', middleName: 'Q', familyName: 'Anders' } },
		})
		// User goes Back and clears the middle name; re-saving must drop it.
		await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'legal-name',
			stepData: { personFacts: { givenName: 'Alice', familyName: 'Anders' } },
		})
		const detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.draft.answers.personFacts.middleName).toBeUndefined()
		expect(detail.draft.answers.personFacts.givenName).toBe('Alice')
	})
})

// The M2-T2 Done-when, encoded as an executable end-to-end check driving the
// real mutation: every supported situation walks its full pre-Review step
// sequence with valid data and lands on 'review' with all 6 steps complete.
describe('pipeline reaches Review for every supported situation (M2-T2)', () => {
	function finalStep(situation: { formType: FormType; applicationKind: ApplicationKind }) {
		const reason = { replacementReason: 'lost' as const }
		if (situation.formType === 'i765') {
			return {
				stepKey: 'eligibility-category',
				stepData: {
					personFacts: { eligibilityCategory: 'C08' },
					form: {
						c8EverArrestedOrConvicted: 'no' as const,
						...(situation.applicationKind === 'replacement' ? reason : {}),
					},
				},
			}
		}
		return {
			stepKey: 'card-details',
			stepData: {
				form: {
					cardStatus: 'permanentResident' as const,
					nameChangedSinceIssuance: 'no' as const,
					...(situation.applicationKind === 'replacement'
						? reason
						: { cardExpirationDate: '2030-01-01' }),
				},
			},
		}
	}

	test.each(supportedSituations)(
		'$formType/$applicationKind reaches Review with valid persisted data',
		async (situation) => {
			const t = newT()
			const alice = t.withIdentity({ subject: 'alice' })
			const applicantId = await alice.mutation(api.applicants.createApplicant, {
				displayName: 'Ana',
				isSelf: true,
			})
			const applicationId = await alice.mutation(api.applications.createApplication, {
				applicantId,
				...situation,
				...(situation.formType === 'i90' ? { i90CardStatus: 'permanentResident' as const } : {}),
			})

			const steps = [
				{
					stepKey: 'legal-name',
					stepData: {
						personFacts: {
							givenName: 'Ana',
							familyName: 'Diaz',
							...(situation.formType === 'i765' ? { hasUsedOtherNames: 'no' as const } : {}),
						},
					},
				},
				{ stepKey: 'date-of-birth', stepData: { personFacts: { dateOfBirth: '1990-05-01' } } },
				{
					stepKey: 'country-of-birth',
					stepData: { personFacts: { countryOfBirth: 'Mexico', cityOfBirth: 'Oaxaca' } },
				},
				...(situation.formType === 'i765'
					? [
							{
								stepKey: 'citizenship',
								stepData: { personFacts: { countryOfCitizenship: 'Mexico' } },
							},
							{
								stepKey: 'other-information',
								stepData: {
									personFacts: { gender: 'female' as const, maritalStatus: 'single' as const },
									form: { previouslyFiledI765: 'no' as const },
								},
							},
							{
								stepKey: 'last-arrival',
								stepData: {
									personFacts: {
										dateOfLastEntry: '2019-08-14',
										placeOfLastEntry: 'JFK Airport, New York',
										statusAtLastEntry: 'F-1 student',
										currentImmigrationStatus: 'Pending adjustment applicant',
										usedTravelDocument: 'no' as const,
									},
								},
							},
						]
					: [
							{
								stepKey: 'personal-details',
								stepData: {
									personFacts: {
										gender: 'female' as const,
										motherGivenName: 'Rosa',
										fatherGivenName: 'Miguel',
										classOfAdmission: 'IR1',
										dateOfAdmission: '2015-06-10',
									},
								},
							},
							{
								stepKey: 'immigration-history',
								stepData: {
									personFacts: {
										locationAppliedVisa: 'Ciudad Juarez, Mexico',
										locationIssuedVisa: 'Ciudad Juarez, Mexico',
										becameResidentVia: 'adjustmentOfStatus' as const,
										everInProceedings: 'no' as const,
										filedI407OrAbandoned: 'no' as const,
									},
								},
							},
						]),
				{ stepKey: 'a-number', stepData: { personFacts: { aNumber: '123456789' } } },
				{
					stepKey: 'mailing-address',
					stepData: {
						personFacts: { mailingAddress },
						form: { physicalAddressSameAsMailing: 'yes' as const },
					},
				},
				{ stepKey: 'contact-info', stepData: { personFacts: { daytimePhone: '5125550142' } } },
				...(situation.formType === 'i90'
					? [
							{
								stepKey: 'physical-description',
								stepData: {
									personFacts: {
										heightFeet: '5' as const,
										heightInches: '4' as const,
										weightPounds: '130',
										eyeColor: 'brown' as const,
										hairColor: 'black' as const,
										ethnicity: 'hispanicOrLatino' as const,
										races: ['white' as const],
									},
								},
							},
						]
					: []),
				finalStep(situation),
				{
					stepKey: 'applicant-statement',
					stepData: {
						form: {
							preparedSelfInEnglish: 'yes' as const,
							...(situation.formType === 'i90' ? { requestingAccommodation: 'no' as const } : {}),
						},
					},
				},
			]

			let result:
				{ nextStepKey: string; completedStepCount: number; totalStepCount: number } | undefined
			for (const step of steps) {
				result = await alice.mutation(api.applications.saveApplicationStep, {
					applicationId,
					...step,
				})
			}

			const preReviewCount = situation.formType === 'i765' ? 11 : 11
			expect(result).toBeDefined()
			expect(result!.nextStepKey).toBe('review')
			expect(result!.completedStepCount).toBe(preReviewCount)
			expect(result!.totalStepCount).toBe(preReviewCount + 1)
		},
	)
})

// Complete I-90 renewal answer set, shared by the readiness milestone and the
// filed-lifecycle tests (which need a genuinely ready application to file).
const i90Steps = [
	{ stepKey: 'legal-name', stepData: { personFacts: { givenName: 'Ana', familyName: 'Diaz' } } },
	{ stepKey: 'date-of-birth', stepData: { personFacts: { dateOfBirth: '1990-05-01' } } },
	{
		stepKey: 'country-of-birth',
		stepData: { personFacts: { countryOfBirth: 'Mexico', cityOfBirth: 'Oaxaca' } },
	},
	{
		stepKey: 'personal-details',
		stepData: {
			personFacts: {
				gender: 'female' as const,
				motherGivenName: 'Rosa',
				fatherGivenName: 'Miguel',
				classOfAdmission: 'IR1',
				dateOfAdmission: '2015-06-10',
			},
		},
	},
	{
		stepKey: 'immigration-history',
		stepData: {
			personFacts: {
				locationAppliedVisa: 'Ciudad Juarez, Mexico',
				locationIssuedVisa: 'Ciudad Juarez, Mexico',
				becameResidentVia: 'immigrantVisa' as const,
				destinationAtAdmission: 'San Francisco, CA',
				portOfEntryCityState: 'San Ysidro, CA',
				everInProceedings: 'no' as const,
				filedI407OrAbandoned: 'no' as const,
			},
		},
	},
	{ stepKey: 'a-number', stepData: { personFacts: { aNumber: '123456789' } } },
	{
		stepKey: 'mailing-address',
		stepData: {
			personFacts: { mailingAddress },
			form: { physicalAddressSameAsMailing: 'yes' as const },
		},
	},
	{ stepKey: 'contact-info', stepData: { personFacts: { daytimePhone: '5125550142' } } },
	{
		stepKey: 'physical-description',
		stepData: {
			personFacts: {
				heightFeet: '5' as const,
				heightInches: '4' as const,
				weightPounds: '130',
				eyeColor: 'brown' as const,
				hairColor: 'black' as const,
				ethnicity: 'hispanicOrLatino' as const,
				races: ['white' as const],
			},
		},
	},
	{
		stepKey: 'card-details',
		stepData: {
			form: {
				cardStatus: 'permanentResident' as const,
				cardExpirationDate: '2030-01-01',
				nameChangedSinceIssuance: 'no' as const,
			},
		},
	},
	{
		stepKey: 'applicant-statement',
		stepData: {
			form: {
				preparedSelfInEnglish: 'yes' as const,
				requestingAccommodation: 'no' as const,
			},
		},
	},
]

async function setupI90() {
	const t = newT()
	const alice = t.withIdentity({ subject: 'alice' })
	const applicantId = await alice.mutation(api.applicants.createApplicant, {
		displayName: 'Ana',
		isSelf: true,
	})
	const applicationId = await alice.mutation(api.applications.createApplication, {
		applicantId,
		formType: 'i90',
		applicationKind: 'renewal',
		i90CardStatus: 'permanentResident',
	})
	return { t, alice, applicationId }
}

/** Answer every step and waive every document slot: genuinely ready to file. */
async function setupReadyI90() {
	const { t, alice, applicationId } = await setupI90()
	for (const step of i90Steps) {
		await alice.mutation(api.applications.saveApplicationStep, { applicationId, ...step })
	}
	await t.run(async (ctx) => {
		const slots = await ctx.db
			.query('applicationDocuments')
			.withIndex('by_applicationId', (q) => q.eq('applicationId', applicationId))
			.take(50)
		for (const slot of slots) {
			await ctx.db.patch('applicationDocuments', slot._id, { status: 'waived' })
		}
	})
	return { t, alice, applicationId }
}

// Slice 3c: the I-90 field contract is complete, so a fully-answered I-90 with
// resolved documents must genuinely reach isReadyToFile through the real
// mutations — and the name-change answer must drive its document requirement.
describe('I-90 end-to-end readiness (milestone)', () => {
	test('a fully answered I-90 renewal with resolved documents is ready to file', async () => {
		const { t, alice, applicationId } = await setupI90()
		for (const step of i90Steps) {
			await alice.mutation(api.applications.saveApplicationStep, { applicationId, ...step })
		}
		await t.run(async (ctx) => {
			const slots = await ctx.db
				.query('applicationDocuments')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', applicationId))
				.take(50)
			for (const slot of slots) {
				await ctx.db.patch('applicationDocuments', slot._id, { status: 'waived' })
			}
		})
		const { readiness, application } = await alice.query(api.applications.getApplication, {
			applicationId,
		})
		expect(application.currentStepKey).toBe('review')
		expect(readiness.blockers).toEqual([])
		expect(readiness.isReadyToFile).toBe(true)
	})

	test('answering "name changed" adds the evidence slot; flipping back removes it', async () => {
		const { alice, applicationId } = await setupI90()
		await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'card-details',
			stepData: {
				form: {
					cardStatus: 'permanentResident' as const,
					nameChangedSinceIssuance: 'yes' as const,
					previousFamilyName: 'Diaz',
					previousGivenName: 'Ana',
				},
			},
		})
		let detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.requirements.map((r) => r.requirementKey)).toContain('nameChangeEvidence')

		await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'card-details',
			stepData: {
				form: {
					cardStatus: 'permanentResident' as const,
					nameChangedSinceIssuance: 'no' as const,
				},
			},
		})
		detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.requirements.map((r) => r.requirementKey)).not.toContain('nameChangeEvidence')
	})
})

// Workflow-truth: getApplication carries a server-computed readiness contract,
// and "ready to file" can never be claimed while any answer, document, or
// form-coverage blocker exists (workflow-repair safety slice 1).
describe('getApplication readiness', () => {
	async function setup() {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const applicantId = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Alice',
			isSelf: true,
		})
		const applicationId = await alice.mutation(api.applications.createApplication, {
			applicantId,
			formType: 'i765',
			applicationKind: 'renewal',
		})
		return { t, alice, applicationId }
	}

	const completeSteps = [
		{
			stepKey: 'legal-name',
			stepData: {
				personFacts: { givenName: 'Ana', familyName: 'Diaz', hasUsedOtherNames: 'no' as const },
			},
		},
		{ stepKey: 'date-of-birth', stepData: { personFacts: { dateOfBirth: '1990-05-01' } } },
		{
			stepKey: 'country-of-birth',
			stepData: { personFacts: { countryOfBirth: 'Mexico', cityOfBirth: 'Oaxaca' } },
		},
		{ stepKey: 'citizenship', stepData: { personFacts: { countryOfCitizenship: 'Mexico' } } },
		{
			stepKey: 'other-information',
			stepData: {
				personFacts: { gender: 'female' as const, maritalStatus: 'single' as const },
				form: { previouslyFiledI765: 'no' as const },
			},
		},
		{
			stepKey: 'last-arrival',
			stepData: {
				personFacts: {
					dateOfLastEntry: '2019-08-14',
					placeOfLastEntry: 'JFK Airport, New York',
					statusAtLastEntry: 'F-1 student',
					currentImmigrationStatus: 'Pending asylum applicant',
					usedTravelDocument: 'no' as const,
				},
			},
		},
		{ stepKey: 'a-number', stepData: { personFacts: { aNumber: '123456789' } } },
		{
			stepKey: 'mailing-address',
			stepData: {
				personFacts: { mailingAddress },
				form: { physicalAddressSameAsMailing: 'yes' as const },
			},
		},
		{ stepKey: 'contact-info', stepData: { personFacts: { daytimePhone: '5125550142' } } },
		{
			stepKey: 'eligibility-category',
			stepData: {
				personFacts: { eligibilityCategory: 'C08' },
				form: { c8EverArrestedOrConvicted: 'no' as const },
			},
		},
		{
			stepKey: 'applicant-statement',
			stepData: { form: { preparedSelfInEnglish: 'yes' as const } },
		},
	]

	test('a fresh application reports answer and document blockers', async () => {
		const { alice, applicationId } = await setup()
		const { readiness } = await alice.query(api.applications.getApplication, { applicationId })
		expect(readiness.isReadyToFile).toBe(false)
		expect(readiness.answersComplete).toBe(false)
		expect(readiness.documentsComplete).toBe(false)
		// Both field contracts are complete — coverage never blocks anymore.
		expect(readiness.formCoverageComplete).toBe(true)
		const kinds = new Set(readiness.blockers.map((blocker) => blocker.kind))
		expect(kinds).toEqual(new Set(['answers', 'document']))
	})

	test('MILESTONE: a fully answered I-765 renewal with resolved documents is ready to file', async () => {
		const { t, alice, applicationId } = await setup()
		for (const step of completeSteps) {
			await alice.mutation(api.applications.saveApplicationStep, { applicationId, ...step })
		}
		// Resolve every requirement slot (waived counts as resolved).
		await t.run(async (ctx) => {
			const slots = await ctx.db
				.query('applicationDocuments')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', applicationId))
				.take(50)
			for (const slot of slots) {
				await ctx.db.patch('applicationDocuments', slot._id, { status: 'waived' })
			}
		})

		const { readiness, application } = await alice.query(api.applications.getApplication, {
			applicationId,
		})
		expect(application.currentStepKey).toBe('review')
		expect(readiness.answersComplete).toBe(true)
		expect(readiness.documentsComplete).toBe(true)
		expect(readiness.formCoverageComplete).toBe(true)
		expect(readiness.blockers).toEqual([])
		expect(readiness.isReadyToFile).toBe(true)
	})

	test('a (c)(8) "yes" to the arrest question adds the court-dispositions slot', async () => {
		const { alice, applicationId } = await setup()
		await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'eligibility-category',
			stepData: {
				personFacts: { eligibilityCategory: 'C08' },
				form: { c8EverArrestedOrConvicted: 'yes' as const },
			},
		})
		let detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.requirements.map((r) => r.requirementKey)).toContain('courtDispositions')

		await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'eligibility-category',
			stepData: {
				personFacts: { eligibilityCategory: 'C08' },
				form: { c8EverArrestedOrConvicted: 'no' as const },
			},
		})
		detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.requirements.map((r) => r.requirementKey)).not.toContain('courtDispositions')
	})

	test('forged stepCompletion flags cannot unlock readiness (re-derived from data)', async () => {
		const { t, alice, applicationId } = await setup()
		await t.run(async (ctx) => {
			const draft = await ctx.db
				.query('applicationDrafts')
				.withIndex('by_applicationId', (q) => q.eq('applicationId', applicationId))
				.unique()
			await ctx.db.patch('applicationDrafts', draft!._id, {
				stepCompletion: Object.fromEntries(completeSteps.map((step) => [step.stepKey, true])),
			})
		})
		const { readiness } = await alice.query(api.applications.getApplication, { applicationId })
		expect(readiness.answersComplete).toBe(false)
		expect(readiness.blockers.some((blocker) => blocker.kind === 'answers')).toBe(true)
	})
})

describe('home dashboard + vault', () => {
	test('empty owner gets a calm zero state', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const dashboard = await alice.query(api.home.getHomeDashboard, {})
		expect(dashboard.summary).toEqual({ expiringDocumentsCount: 0, activeApplicationsCount: 0 })
		expect(dashboard.activeApplications).toHaveLength(0)
		expect(dashboard.attentionItems).toHaveLength(0)
		expect(dashboard.recentActivity).toHaveLength(0)
	})

	test('seeded owner: counts, attention sources, bounded activity', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		await alice.action(api.dev.seed.seedDemo, {})

		const dashboard = await alice.query(api.home.getHomeDashboard, {})
		// 3 drafts + 1 filed are active; closed is excluded.
		expect(dashboard.summary.activeApplicationsCount).toBe(4)
		expect(dashboard.summary.expiringDocumentsCount).toBe(1)

		const expiring = dashboard.attentionItems.filter((i) => i.kind === 'documentExpiring')
		const needed = dashboard.attentionItems.filter((i) => i.kind === 'documentNeeded')
		expect(expiring).toHaveLength(1)
		// Maria's expiring EAD is attached to her active renewal.
		expect(expiring[0]).toMatchObject({ documentType: 'ead', affectsApplicationCount: 1 })
		expect(needed).toHaveLength(1)
		expect(needed[0]).toMatchObject({ requirementKey: 'passportPhoto' })

		expect(dashboard.recentActivity.length).toBeLessThanOrEqual(5)
		// Free-for-everyone entitlement seam: every active application is unlocked.
		expect(dashboard.activeApplications.every((a) => a.isUnlocked)).toBe(true)
	})

	test('vault is owner-scoped and includes needed slots with context', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const bob = t.withIdentity({ subject: 'bob' })
		await alice.action(api.dev.seed.seedDemo, {})

		const vault = await alice.query(api.home.getVault, {})
		expect(vault.documents).toHaveLength(4)
		expect(vault.documents.filter((d) => !d.isCurrent)).toHaveLength(1)
		expect(vault.neededSlots).toHaveLength(1)
		expect(vault.neededSlots[0]).toMatchObject({ requirementKey: 'passportPhoto' })

		const bobVault = await bob.query(api.home.getVault, {})
		expect(bobVault.documents).toHaveLength(0)
		expect(bobVault.neededSlots).toHaveLength(0)
	})
})

// The last P0 of the workflow repair: the filed lifecycle. Nothing but these
// user-confirmed transitions (and the receipt-number reconcile in cases.ts)
// may move an application out of draft.
describe('filed lifecycle', () => {
	test('markFiled files a ready application with the given date and locks editing', async () => {
		const { alice, applicationId } = await setupReadyI90()
		const filedAt = Date.now() - 60_000
		await alice.mutation(api.applications.markFiled, { applicationId, filedAt })

		const { application, readiness } = await alice.query(api.applications.getApplication, {
			applicationId,
		})
		expect(application.status).toBe('filed')
		expect(application.filedAt).toBe(filedAt)
		// The package must stay re-downloadable: the stored draft still renders
		// clean, so readiness (which gates the export button) must hold.
		expect(readiness.isReadyToFile).toBe(true)

		await expect(
			alice.mutation(api.applications.saveApplicationStep, {
				applicationId,
				stepKey: 'legal-name',
				stepData: { personFacts: { givenName: 'Changed', familyName: 'Name' } },
			}),
		).rejects.toThrow(/only draft applications/i)
	})

	test('markFiled on a not-ready application requires explicit acknowledgment', async () => {
		const { alice, applicationId } = await setupI90()
		await expect(
			alice.mutation(api.applications.markFiled, { applicationId, filedAt: Date.now() }),
		).rejects.toThrow(/isn’t complete/i)

		await alice.mutation(api.applications.markFiled, {
			applicationId,
			filedAt: Date.now(),
			acknowledgeNotReady: true,
		})
		const { application } = await alice.query(api.applications.getApplication, { applicationId })
		expect(application.status).toBe('filed')
	})

	test('markFiled is idempotent: re-confirming keeps the original filing date', async () => {
		const { alice, applicationId } = await setupReadyI90()
		const original = Date.now() - 120_000
		await alice.mutation(api.applications.markFiled, { applicationId, filedAt: original })
		await alice.mutation(api.applications.markFiled, { applicationId, filedAt: Date.now() })
		const { application } = await alice.query(api.applications.getApplication, { applicationId })
		expect(application.filedAt).toBe(original)
	})

	test('markFiled rejects future dates and dates before the application existed', async () => {
		const { alice, applicationId } = await setupReadyI90()
		await expect(
			alice.mutation(api.applications.markFiled, {
				applicationId,
				filedAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
			}),
		).rejects.toThrow(/future/i)
		await expect(
			alice.mutation(api.applications.markFiled, {
				applicationId,
				filedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
			}),
		).rejects.toThrow(/before this application was started/i)
	})

	test('lifecycle mutations are owner-scoped', async () => {
		const { t, alice, applicationId } = await setupReadyI90()
		const bob = t.withIdentity({ subject: 'bob' })
		await expect(
			bob.mutation(api.applications.markFiled, { applicationId, filedAt: Date.now() }),
		).rejects.toThrow('Application not found')
		await expect(
			bob.mutation(api.applications.closeApplication, { applicationId }),
		).rejects.toThrow('Application not found')
		await expect(
			bob.mutation(api.applications.reopenApplication, { applicationId }),
		).rejects.toThrow('Application not found')
		await expect(
			bob.mutation(api.applications.deleteApplication, { applicationId }),
		).rejects.toThrow('Application not found')
		// Alice's application is untouched by all of Bob's attempts.
		const { application } = await alice.query(api.applications.getApplication, { applicationId })
		expect(application.status).toBe('draft')
	})

	test('closeApplication closes a draft; reopen restores it to draft', async () => {
		const { alice, applicationId } = await setupI90()
		await alice.mutation(api.applications.closeApplication, { applicationId })
		let detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.application.status).toBe('closed')
		expect(detail.application.closedAt).toBeDefined()

		await alice.mutation(api.applications.reopenApplication, { applicationId })
		detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.application.status).toBe('draft')
		expect(detail.application.closedAt).toBeUndefined()
	})

	test('closing a filed application keeps the filing record; reopen restores filed', async () => {
		const { alice, applicationId } = await setupReadyI90()
		const filedAt = Date.now() - 60_000
		await alice.mutation(api.applications.markFiled, { applicationId, filedAt })
		await alice.mutation(api.applications.closeApplication, { applicationId })
		let detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.application.status).toBe('closed')
		expect(detail.application.filedAt).toBe(filedAt)

		// Reopening a closed-but-filed application restores FILED, not draft —
		// closing never erased the filing record, so reopening can't either.
		await alice.mutation(api.applications.reopenApplication, { applicationId })
		detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.application.status).toBe('filed')
		expect(detail.application.filedAt).toBe(filedAt)
	})

	test('reopen un-files a filed application only while no case is linked', async () => {
		const { alice, applicationId } = await setupReadyI90()
		await alice.mutation(api.applications.markFiled, { applicationId, filedAt: Date.now() })
		await alice.mutation(api.applications.reopenApplication, { applicationId })
		let detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.application.status).toBe('draft')
		expect(detail.application.filedAt).toBeUndefined()

		// File again, link a real receipt: un-filing is now blocked.
		await alice.mutation(api.applications.markFiled, { applicationId, filedAt: Date.now() })
		await alice.mutation(api.cases.createCase, {
			receiptNumber: 'EAC1234567890',
			applicationId,
		})
		await expect(
			alice.mutation(api.applications.reopenApplication, { applicationId }),
		).rejects.toThrow(/tracked USCIS case/i)
	})

	test('deleteApplication cascades draft, slots, and entitlements, and unlinks a case', async () => {
		const { t, alice, applicationId } = await setupReadyI90()
		// A closed application can still have a case (filed → case → closed).
		await alice.mutation(api.applications.markFiled, { applicationId, filedAt: Date.now() })
		const caseId = await alice.mutation(api.cases.createCase, {
			receiptNumber: 'EAC1234567890',
			applicationId,
		})
		await t.run(async (ctx) => {
			const application = await ctx.db.get('applications', applicationId)
			await ctx.db.insert('entitlements', {
				ownerId: application!.ownerId,
				applicationId,
				status: 'active',
				source: 'devStub',
				updatedAt: Date.now(),
			})
		})

		// Filed applications are the filing record — deletion is refused.
		await expect(
			alice.mutation(api.applications.deleteApplication, { applicationId }),
		).rejects.toThrow(/can’t be deleted/i)

		await alice.mutation(api.applications.closeApplication, { applicationId })
		await alice.mutation(api.applications.deleteApplication, { applicationId })

		await expect(alice.query(api.applications.getApplication, { applicationId })).rejects.toThrow(
			'Application not found',
		)
		await t.run(async (ctx) => {
			const [draft, slots, entitlements] = await Promise.all([
				ctx.db
					.query('applicationDrafts')
					.withIndex('by_applicationId', (q) => q.eq('applicationId', applicationId))
					.unique(),
				ctx.db
					.query('applicationDocuments')
					.withIndex('by_applicationId', (q) => q.eq('applicationId', applicationId))
					.take(50),
				ctx.db
					.query('entitlements')
					.withIndex('by_applicationId', (q) => q.eq('applicationId', applicationId))
					.take(10),
			])
			expect(draft).toBeNull()
			expect(slots).toHaveLength(0)
			expect(entitlements).toHaveLength(0)
		})
		// The case is a real receipt: kept, but unlinked.
		const orphanedCase = await alice.query(api.cases.getCase, { caseId })
		expect(orphanedCase.applicationId).toBeUndefined()
	})

	test('markFiled on a closed application is refused until reopened', async () => {
		const { alice, applicationId } = await setupReadyI90()
		await alice.mutation(api.applications.closeApplication, { applicationId })
		await expect(
			alice.mutation(api.applications.markFiled, { applicationId, filedAt: Date.now() }),
		).rejects.toThrow(/closed/i)
	})
})
