/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import { type ApplicationKind, type FormType, supportedSituations } from './shared/applicationShapes'

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
		expect(detail.application.totalStepCount).toBe(7)
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
			stepData: { personFacts: { givenName: 'Alice', familyName: 'Anders' } },
		})
		expect(result).toEqual({ nextStepKey: 'date-of-birth', completedStepCount: 1, totalStepCount: 7 })

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
			{ stepKey: 'legal-name', stepData: { personFacts: { givenName: 'Alice', familyName: 'Anders' } } },
			{ stepKey: 'date-of-birth', stepData: { personFacts: { dateOfBirth: '1991-02-03' } } },
			{ stepKey: 'country-of-birth', stepData: { personFacts: { countryOfBirth: 'Brazil' } } },
			{ stepKey: 'a-number', stepData: { personFacts: { aNumber: '01234567' } } },
			{ stepKey: 'mailing-address', stepData: { personFacts: { mailingAddress } } },
		]
		for (const step of steps) {
			await alice.mutation(api.applications.saveApplicationStep, { applicationId, ...step })
			// Profile stays untouched until every pre-Review step is complete.
			const applicant = await t.run((ctx) => ctx.db.get('applicants', applicantId))
			expect(applicant!.profile.givenName).toBeUndefined()
		}

		const result = await alice.mutation(api.applications.saveApplicationStep, {
			applicationId,
			stepKey: 'eligibility-category',
			stepData: { personFacts: { eligibilityCategory: 'C08' } },
		})
		expect(result.nextStepKey).toBe('review')

		const applicant = await t.run((ctx) => ctx.db.get('applicants', applicantId))
		expect(applicant!.profile).toMatchObject({
			givenName: 'Alice',
			familyName: 'Anders',
			dateOfBirth: '1991-02-03',
			countryOfBirth: 'Brazil',
			aNumber: '01234567',
			eligibilityCategory: 'C08',
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
					...(situation.applicationKind === 'replacement' ? { form: reason } : {}),
				},
			}
		}
		return {
			stepKey: 'card-details',
			stepData: {
				form:
					situation.applicationKind === 'replacement' ? reason : { cardExpirationDate: '2030-01-01' },
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
			})

			const steps = [
				{ stepKey: 'legal-name', stepData: { personFacts: { givenName: 'Ana', familyName: 'Diaz' } } },
				{ stepKey: 'date-of-birth', stepData: { personFacts: { dateOfBirth: '1990-05-01' } } },
				{ stepKey: 'country-of-birth', stepData: { personFacts: { countryOfBirth: 'Mexico' } } },
				{ stepKey: 'a-number', stepData: { personFacts: { aNumber: '123456789' } } },
				{ stepKey: 'mailing-address', stepData: { personFacts: { mailingAddress } } },
				finalStep(situation),
			]

			let result: { nextStepKey: string; completedStepCount: number; totalStepCount: number } | undefined
			for (const step of steps) {
				result = await alice.mutation(api.applications.saveApplicationStep, { applicationId, ...step })
			}

			expect(result).toBeDefined()
			expect(result!.nextStepKey).toBe('review')
			expect(result!.completedStepCount).toBe(6)
			expect(result!.totalStepCount).toBe(7)
		},
	)
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
