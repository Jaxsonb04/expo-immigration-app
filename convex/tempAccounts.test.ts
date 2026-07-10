/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { internal } from './_generated/api'
import schema from './schema'
import { TEMP_ACCOUNT_RETENTION_MS, isExpiredTempAccount } from './shared/tempAccounts'

const modules = import.meta.glob('./**/*.ts')
const newT = () => convexTest(schema, modules)

const HOUR = 60 * 60 * 1000
const NOW = Date.parse('2026-07-09T12:00:00Z')

describe('temp-account deletion boundary (M6-T4)', () => {
	test('retention window is exactly 48 hours', () => {
		expect(TEMP_ACCOUNT_RETENTION_MS).toBe(48 * HOUR)
	})

	test('an anonymous account 47 hours old is kept', () => {
		expect(isExpiredTempAccount({ isAnonymous: true, createdAt: NOW - 47 * HOUR }, NOW)).toBe(false)
	})

	test('an anonymous account 49 hours old is deleted', () => {
		expect(isExpiredTempAccount({ isAnonymous: true, createdAt: NOW - 49 * HOUR }, NOW)).toBe(true)
	})

	test('exactly 48 hours is kept (strictly older only)', () => {
		expect(isExpiredTempAccount({ isAnonymous: true, createdAt: NOW - 48 * HOUR }, NOW)).toBe(false)
	})

	test('a converted-then-idle account is never deleted, no matter how old', () => {
		expect(isExpiredTempAccount({ isAnonymous: false, createdAt: NOW - 500 * HOUR }, NOW)).toBe(false)
	})

	test('a missing/null isAnonymous flag means keep — only exactly true qualifies', () => {
		expect(isExpiredTempAccount({ createdAt: NOW - 500 * HOUR }, NOW)).toBe(false)
		expect(isExpiredTempAccount({ isAnonymous: null, createdAt: NOW - 500 * HOUR }, NOW)).toBe(false)
	})

	test('an unknown creation time means keep', () => {
		expect(isExpiredTempAccount({ isAnonymous: true }, NOW)).toBe(false)
		expect(isExpiredTempAccount({ isAnonymous: true, createdAt: null }, NOW)).toBe(false)
		expect(isExpiredTempAccount({ isAnonymous: true, createdAt: 'not a date' }, NOW)).toBe(false)
	})

	test('createdAt is honored across storage representations (number, Date, ISO string)', () => {
		const old = NOW - 49 * HOUR
		expect(isExpiredTempAccount({ isAnonymous: true, createdAt: old }, NOW)).toBe(true)
		expect(isExpiredTempAccount({ isAnonymous: true, createdAt: new Date(old) }, NOW)).toBe(true)
		expect(
			isExpiredTempAccount({ isAnonymous: true, createdAt: new Date(old).toISOString() }, NOW),
		).toBe(true)
	})
})

const ANON = 'https://test.convex.site|anon-user'
const REAL = 'https://test.convex.site|real-user'
const OTHER = 'https://test.convex.site|other-user'

/** Seed one row in every filing-side table for an owner; returns ids. */
async function seedOwner(t: ReturnType<typeof newT>, ownerId: string, receipt: string) {
	return await t.run(async (ctx) => {
		const applicantId = await ctx.db.insert('applicants', {
			ownerId,
			isSelf: true,
			displayName: 'Me',
			profile: {},
			updatedAt: NOW,
		})
		const applicationId = await ctx.db.insert('applications', {
			ownerId,
			applicantId,
			formType: 'i765' as const,
			applicationKind: 'renewal' as const,
			status: 'draft' as const,
			completedStepCount: 1,
			totalStepCount: 7,
			updatedAt: NOW,
		})
		await ctx.db.insert('applicationDrafts', {
			ownerId,
			applicationId,
			formType: 'i765' as const,
			answers: { personFacts: { givenName: 'Maria' }, form: {} },
			stepCompletion: { 'legal-name': true },
			updatedAt: NOW,
		})
		const storageId = await ctx.storage.store(new Blob(['fake document bytes']))
		const documentId = await ctx.db.insert('documents', {
			ownerId,
			applicantId,
			type: 'ead' as const,
			storageId,
			updatedAt: NOW,
		})
		await ctx.db.insert('applicationDocuments', {
			ownerId,
			applicationId,
			requirementKey: 'eadCard',
			status: 'attached' as const,
			documentId,
			updatedAt: NOW,
		})
		await ctx.db.insert('cases', {
			ownerId,
			receiptNumber: receipt,
			status: 'caseReceived' as const,
			statusHistory: [{ status: 'caseReceived' as const, occurredAt: NOW }],
			updatedAt: NOW,
		})
		await ctx.db.insert('entitlements', {
			ownerId,
			applicationId,
			status: 'active' as const,
			source: 'devStub' as const,
			updatedAt: NOW,
		})
		await ctx.db.insert('assistantUsage', {
			ownerId,
			day: '2026-07-09',
			count: 3,
			updatedAt: NOW,
		})
		return { applicantId, applicationId, documentId }
	})
}

const FILING_TABLES = [
	'applicants',
	'applications',
	'applicationDrafts',
	'applicationDocuments',
	'documents',
	'cases',
	'entitlements',
	'assistantUsage',
] as const

async function countByOwner(t: ReturnType<typeof newT>, ownerId: string) {
	return await t.run(async (ctx) => {
		const counts: Record<string, number> = {}
		for (const table of FILING_TABLES) {
			const rows = await ctx.db.query(table).collect()
			counts[table] = rows.filter(
				(row) => (row as { ownerId: string }).ownerId === ownerId,
			).length
		}
		return counts
	})
}

describe('reassignAccountData (M6-T3 anonymous-link carryover)', () => {
	test('moves every filing-side row to the new owner and leaves nothing behind', async () => {
		const t = newT()
		await seedOwner(t, ANON, 'ABC1234567890')
		await seedOwner(t, OTHER, 'XYZ9876543210')

		await t.mutation(internal.account.reassignAccountData, {
			fromOwnerId: ANON,
			toOwnerId: REAL,
		})

		const anonCounts = await countByOwner(t, ANON)
		const realCounts = await countByOwner(t, REAL)
		const otherCounts = await countByOwner(t, OTHER)
		for (const table of FILING_TABLES) {
			expect(anonCounts[table], `${table} left under anonymous owner`).toBe(0)
			expect(realCounts[table], `${table} not moved to new owner`).toBe(1)
			// A third account's data is untouched.
			expect(otherCounts[table], `${table} of another owner disturbed`).toBe(1)
		}
	})

	test('merging into an account that already has data respects per-owner invariants', async () => {
		const t = newT()
		// Both sides track the SAME receipt and have an isSelf applicant and
		// same-day assistant usage.
		await seedOwner(t, ANON, 'ABC1234567890')
		await seedOwner(t, REAL, 'ABC1234567890')

		await t.mutation(internal.account.reassignAccountData, {
			fromOwnerId: ANON,
			toOwnerId: REAL,
		})

		await t.run(async (ctx) => {
			const applicants = (await ctx.db.query('applicants').collect()).filter(
				(row) => row.ownerId === REAL,
			)
			// Two applicant rows survive but only one stays isSelf.
			expect(applicants).toHaveLength(2)
			expect(applicants.filter((row) => row.isSelf)).toHaveLength(1)

			// The duplicate receipt collapsed to the target's single case.
			const cases = (await ctx.db.query('cases').collect()).filter(
				(row) => row.ownerId === REAL,
			)
			expect(cases).toHaveLength(1)

			// Same-day usage merged by summing (3 + 3), so converting can't reset
			// the daily quota.
			const usage = (await ctx.db.query('assistantUsage').collect()).filter(
				(row) => row.ownerId === REAL,
			)
			expect(usage).toHaveLength(1)
			expect(usage[0].count).toBe(6)
		})
		// Nothing may remain under the anonymous owner.
		const anonCounts = await countByOwner(t, ANON)
		for (const table of FILING_TABLES) {
			expect(anonCounts[table], `${table} left under anonymous owner`).toBe(0)
		}
	})

	test('no-op when both owner ids are the same', async () => {
		const t = newT()
		await seedOwner(t, ANON, 'ABC1234567890')
		await t.mutation(internal.account.reassignAccountData, {
			fromOwnerId: ANON,
			toOwnerId: ANON,
		})
		const counts = await countByOwner(t, ANON)
		for (const table of FILING_TABLES) {
			expect(counts[table]).toBe(1)
		}
	})
})

describe('purgeOwnerData (M6-T4 cron cascade)', () => {
	test('erases exactly one owner, storage blobs included', async () => {
		const t = newT()
		const { documentId } = await seedOwner(t, ANON, 'ABC1234567890')
		await seedOwner(t, OTHER, 'XYZ9876543210')

		const storageId = await t.run(async (ctx) => {
			const doc = await ctx.db.get('documents', documentId)
			return doc!.storageId
		})

		await t.mutation(internal.account.purgeOwnerData, { ownerId: ANON })

		const anonCounts = await countByOwner(t, ANON)
		const otherCounts = await countByOwner(t, OTHER)
		for (const table of FILING_TABLES) {
			expect(anonCounts[table], `${table} survived the purge`).toBe(0)
			expect(otherCounts[table], `${table} of another owner disturbed`).toBe(1)
		}
		await t.run(async (ctx) => {
			expect(await ctx.storage.get(storageId)).toBeNull()
		})
	})
})
