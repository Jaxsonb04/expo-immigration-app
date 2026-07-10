/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const newT = () => convexTest(schema, modules)

const PROFILE = {
	givenName: 'Maria',
	familyName: 'Santos',
	dateOfBirth: '1990-04-12',
	aNumber: '123456789',
	mailingAddress: {
		street: '1 Main St',
		city: 'San Jose',
		state: 'CA',
		zipCode: '95112',
	},
}

describe('updateSelfProfile (M6-T5 profile editing)', () => {
	test('lazily creates the self applicant and saves the facts', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })

		await alice.mutation(api.applicants.updateSelfProfile, {
			displayName: 'Maria Santos',
			profile: PROFILE,
		})

		const self = await alice.query(api.applicants.getSelfApplicant, {})
		expect(self).not.toBeNull()
		expect(self!.isSelf).toBe(true)
		expect(self!.displayName).toBe('Maria Santos')
		expect(self!.profile.givenName).toBe('Maria')
		expect(self!.profile.mailingAddress?.state).toBe('CA')
	})

	test('updates the existing self applicant and preserves eligibilityCategory', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		await alice.mutation(api.applicants.updateSelfProfile, {
			profile: { ...PROFILE, eligibilityCategory: '(a)(5)' },
		})

		await alice.mutation(api.applicants.updateSelfProfile, {
			profile: { givenName: 'Mari', familyName: 'Santos' },
		})

		const self = await alice.query(api.applicants.getSelfApplicant, {})
		expect(self!.profile.givenName).toBe('Mari')
		// Interview-owned field survives a profile-screen save that omits it.
		expect(self!.profile.eligibilityCategory).toBe('(a)(5)')
		// Omitted optionals are cleared, not retained.
		expect(self!.profile.aNumber).toBeUndefined()
	})

	test('rejects malformed facts via the shared shape', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		await expect(
			alice.mutation(api.applicants.updateSelfProfile, {
				profile: { aNumber: 'ABC123' },
			}),
		).rejects.toThrow()
		await expect(
			alice.mutation(api.applicants.updateSelfProfile, {
				profile: { dateOfBirth: '1990-02-31' },
			}),
		).rejects.toThrow()
	})

	test('owners are isolated: Bob never sees or edits Alice’s profile', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const bob = t.withIdentity({ subject: 'bob' })

		await alice.mutation(api.applicants.updateSelfProfile, { profile: PROFILE })
		expect(await bob.query(api.applicants.getSelfApplicant, {})).toBeNull()

		await bob.mutation(api.applicants.updateSelfProfile, {
			profile: { givenName: 'Bob', familyName: 'Jones' },
		})
		const aliceSelf = await alice.query(api.applicants.getSelfApplicant, {})
		expect(aliceSelf!.profile.givenName).toBe('Maria')
	})

	test('requires authentication', async () => {
		const t = newT()
		await expect(
			t.mutation(api.applicants.updateSelfProfile, { profile: {} }),
		).rejects.toThrow('Not authenticated')
	})
})
