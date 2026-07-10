/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import { renewalStateFor } from './shared/renewals'

const modules = import.meta.glob('./**/*.ts')
const newT = () => convexTest(schema, modules)

const TODAY = '2026-07-09'

describe('renewal window math (M6-T6, USCIS 180-day windows)', () => {
	test('inside the 180-day window → file now', () => {
		expect(renewalStateFor({ expiryDate: '2026-10-01' }, TODAY)).toEqual({
			status: 'windowOpen',
			daysUntilExpiry: 84,
		})
	})

	test('exactly 180 days out is already open; 181 is not yet', () => {
		expect(renewalStateFor({ expiryDate: '2027-01-05' }, TODAY)).toMatchObject({
			status: 'windowOpen',
			daysUntilExpiry: 180,
		})
		expect(renewalStateFor({ expiryDate: '2027-01-06' }, TODAY)).toMatchObject({
			status: 'windowOpens',
			opensOn: '2026-07-10',
		})
	})

	test('expiring today counts as open, not expired', () => {
		expect(renewalStateFor({ expiryDate: TODAY }, TODAY)).toEqual({
			status: 'windowOpen',
			daysUntilExpiry: 0,
		})
	})

	test('already expired → expired with day count', () => {
		expect(renewalStateFor({ expiryDate: '2026-07-01' }, TODAY)).toEqual({
			status: 'expired',
			daysSinceExpiry: 8,
		})
	})

	test('a prior filing date with no expiry → awaiting the new card', () => {
		expect(renewalStateFor({ filedAt: '2026-05-01' }, TODAY)).toEqual({
			status: 'awaitingCard',
			filedOn: '2026-05-01',
		})
	})

	test('nothing usable → null', () => {
		expect(renewalStateFor({}, TODAY)).toBeNull()
		expect(renewalStateFor({ expiryDate: 'not-a-date' }, TODAY)).toBeNull()
	})
})

describe('renewal entries (M6-T6 manual path)', () => {
	test('adds and lists a manual expiry entry', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		await alice.mutation(api.renewals.addRenewalEntry, { kind: 'ead', expiryDate: '2026-12-01' })

		const items = await alice.query(api.renewals.listRenewalItems, {})
		expect(items).toHaveLength(1)
		expect(items[0]).toMatchObject({ source: 'manual', kind: 'ead', expiryDate: '2026-12-01' })
	})

	test('rejects an entry with no dates or malformed dates', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		await expect(alice.mutation(api.renewals.addRenewalEntry, { kind: 'ead' })).rejects.toThrow(
			'expiry date or a filing date',
		)
		await expect(
			alice.mutation(api.renewals.addRenewalEntry, { kind: 'ead', expiryDate: '12/01/2026' }),
		).rejects.toThrow('YYYY-MM-DD')
	})

	test('owner isolation: entries never leak and cannot be deleted cross-owner', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const bob = t.withIdentity({ subject: 'bob' })
		const entryId = await alice.mutation(api.renewals.addRenewalEntry, {
			kind: 'greenCard',
			filedAt: '2026-06-15',
		})

		expect(await bob.query(api.renewals.listRenewalItems, {})).toHaveLength(0)
		await expect(bob.mutation(api.renewals.deleteRenewalEntry, { entryId })).rejects.toThrow(
			'Entry not found',
		)
		await alice.mutation(api.renewals.deleteRenewalEntry, { entryId })
		expect(await alice.query(api.renewals.listRenewalItems, {})).toHaveLength(0)
	})
})

describe('ownerPreferences (M6-T6 intro dismissal)', () => {
	test('defaults false, persists true, per owner', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const bob = t.withIdentity({ subject: 'bob' })

		expect(await alice.query(api.preferences.getPreference, { key: 'formsIntroDismissed' })).toBe(
			false,
		)
		await alice.mutation(api.preferences.setPreference, {
			key: 'formsIntroDismissed',
			value: true,
		})
		expect(await alice.query(api.preferences.getPreference, { key: 'formsIntroDismissed' })).toBe(
			true,
		)
		expect(await bob.query(api.preferences.getPreference, { key: 'formsIntroDismissed' })).toBe(
			false,
		)
	})
})
