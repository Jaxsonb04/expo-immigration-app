/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const newT = () => convexTest(schema, modules)

beforeEach(() => {
	vi.stubEnv('DEV_SEED_ENABLED', 'true')
})

const RECEIPT = 'EAC1234567890'

describe('createCase', () => {
	test('tracks a valid receipt and seeds a one-entry timeline', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const caseId = await alice.mutation(api.cases.createCase, { receiptNumber: RECEIPT })
		const tracked = await alice.query(api.cases.getCase, { caseId })
		expect(tracked).toMatchObject({ receiptNumber: RECEIPT, status: 'caseReceived' })
		expect(tracked.statusHistory).toHaveLength(1)
		expect(tracked.statusHistory[0]).toMatchObject({ status: 'caseReceived' })
	})

	test('normalizes case and whitespace before validating', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const caseId = await alice.mutation(api.cases.createCase, {
			receiptNumber: '  eac 123 456 7890 ',
		})
		const tracked = await alice.query(api.cases.getCase, { caseId })
		expect(tracked.receiptNumber).toBe(RECEIPT)
	})

	test.each(['EAC123', 'EA1234567890', 'EAC12345678901', '1234567890EAC', 'EACABCDEFGHIJ'])(
		'rejects malformed receipt %s',
		async (bad) => {
			const t = newT()
			const alice = t.withIdentity({ subject: 'alice' })
			await expect(
				alice.mutation(api.cases.createCase, { receiptNumber: bad }),
			).rejects.toThrow(/receipt number/i)
		},
	)

	test('rejects a duplicate receipt for the same owner, but not across owners', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const bob = t.withIdentity({ subject: 'bob' })
		await alice.mutation(api.cases.createCase, { receiptNumber: RECEIPT })
		await expect(
			alice.mutation(api.cases.createCase, { receiptNumber: RECEIPT }),
		).rejects.toThrow(/already tracking/i)
		// Owner-scoped uniqueness: Bob can track the same receipt.
		await expect(bob.mutation(api.cases.createCase, { receiptNumber: RECEIPT })).resolves.toBeDefined()
	})

	test('links an owned application; rejects a foreign one', async () => {
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
		const caseId = await alice.mutation(api.cases.createCase, {
			receiptNumber: RECEIPT,
			applicationId,
		})
		expect((await alice.query(api.cases.getCase, { caseId })).applicationId).toBe(applicationId)

		const bob = t.withIdentity({ subject: 'bob' })
		await expect(
			bob.mutation(api.cases.createCase, { receiptNumber: 'WAC9876543210', applicationId }),
		).rejects.toThrow('Application not found')
	})
})

describe('addStatusUpdate', () => {
	test('appends to the timeline and advances the current status', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const caseId = await alice.mutation(api.cases.createCase, { receiptNumber: RECEIPT })
		await alice.mutation(api.cases.addStatusUpdate, {
			caseId,
			status: 'biometrics',
			note: 'ASC appointment 8/1',
		})
		const tracked = await alice.query(api.cases.getCase, { caseId })
		expect(tracked.status).toBe('biometrics')
		expect(tracked.statusHistory).toHaveLength(2)
		expect(tracked.statusHistory[1]).toMatchObject({ status: 'biometrics', note: 'ASC appointment 8/1' })
	})

	test('backdates when occurredAt is provided', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const caseId = await alice.mutation(api.cases.createCase, { receiptNumber: RECEIPT })
		await alice.mutation(api.cases.addStatusUpdate, {
			caseId,
			status: 'approved',
			occurredAt: 1_700_000_000_000,
		})
		const tracked = await alice.query(api.cases.getCase, { caseId })
		expect(tracked.statusHistory[1]!.occurredAt).toBe(1_700_000_000_000)
	})
})

describe('authorization / owner isolation', () => {
	test('all reads and writes are owner-scoped', async () => {
		const t = newT()
		const alice = t.withIdentity({ subject: 'alice' })
		const bob = t.withIdentity({ subject: 'bob' })
		const caseId = await alice.mutation(api.cases.createCase, { receiptNumber: RECEIPT })

		await expect(bob.query(api.cases.getCase, { caseId })).rejects.toThrow('Case not found')
		await expect(
			bob.mutation(api.cases.addStatusUpdate, { caseId, status: 'approved' }),
		).rejects.toThrow('Case not found')
		expect(await bob.query(api.cases.listCases, {})).toHaveLength(0)
		expect(await alice.query(api.cases.listCases, {})).toHaveLength(1)
	})

	test('requires authentication', async () => {
		const t = newT()
		await expect(t.query(api.cases.listCases, {})).rejects.toThrow()
		await expect(t.mutation(api.cases.createCase, { receiptNumber: RECEIPT })).rejects.toThrow()
	})
})
