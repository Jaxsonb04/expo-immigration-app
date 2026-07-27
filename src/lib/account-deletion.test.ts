import { describe, expect, test } from 'vitest'
import { resolveAccountDeletionMode } from './account-deletion'

describe('account deletion mode', () => {
	test('defaults closed while account type is unresolved', () => {
		expect(resolveAccountDeletionMode(true, false)).toBe('loading')
		expect(resolveAccountDeletionMode(true, true)).toBe('loading')
	})

	test('selects password confirmation only for a resolved permanent account', () => {
		expect(resolveAccountDeletionMode(false, true)).toBe('credentialed')
	})

	test('selects anonymous deletion only for a resolved temporary account', () => {
		expect(resolveAccountDeletionMode(false, false)).toBe('temporary')
	})
})
