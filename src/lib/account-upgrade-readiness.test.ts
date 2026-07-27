import { describe, expect, test } from 'vitest'
import { isCredentialedAccountReady } from './account-upgrade-readiness'

describe('isCredentialedAccountReady', () => {
	test('requires the client and server to agree on the same permanent user', () => {
		const client = { id: 'permanent-user', isAnonymous: false }

		expect(
			isCredentialedAccountReady(client, {
				userId: 'permanent-user',
				isAnonymous: false,
			}),
		).toBe(true)
		expect(
			isCredentialedAccountReady(client, {
				userId: 'old-anonymous-user',
				isAnonymous: false,
			}),
		).toBe(false)
	})

	test('never treats an anonymous or unresolved server identity as ready', () => {
		const client = { id: 'permanent-user', isAnonymous: false }

		expect(isCredentialedAccountReady(client, undefined)).toBe(false)
		expect(isCredentialedAccountReady(client, null)).toBe(false)
		expect(
			isCredentialedAccountReady(client, {
				userId: 'permanent-user',
				isAnonymous: true,
			}),
		).toBe(false)
		expect(
			isCredentialedAccountReady(
				{ id: 'temporary-user', isAnonymous: true },
				{ userId: 'temporary-user', isAnonymous: true },
			),
		).toBe(false)
	})
})
