import { afterEach, describe, expect, test } from 'vitest'
import { accountGateStore } from './account.data'

afterEach(() => {
	accountGateStore.settle(false)
})

describe('accountGateStore', () => {
	test('resumes a parked action after account conversion', async () => {
		const pending = accountGateStore.request({ title: 'Keep your work' })

		accountGateStore.settle(true)

		await expect(pending).resolves.toBe(true)
		expect(accountGateStore.getSnapshot().request).toBeNull()
	})

	test('parks an action when the upgrade surface is dismissed', async () => {
		const pending = accountGateStore.request()

		accountGateStore.settle(false)

		await expect(pending).resolves.toBe(false)
	})

	test('cancels an older request before installing a newer gate', async () => {
		const older = accountGateStore.request({ title: 'Older action' })
		const newer = accountGateStore.request({ title: 'Newer action' })

		await expect(older).resolves.toBe(false)
		expect(accountGateStore.getSnapshot().request?.recap?.title).toBe('Newer action')

		accountGateStore.settle(true)
		await expect(newer).resolves.toBe(true)
	})
})
