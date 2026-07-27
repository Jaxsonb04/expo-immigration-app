import { describe, expect, test } from 'vitest'
import {
	PASSWORD_RESET_REDIRECT_URL,
	firstSearchParam,
	validateNewPassword,
} from './password-recovery'

describe('password recovery', () => {
	test('uses the registered app scheme for reset callbacks', () => {
		expect(PASSWORD_RESET_REDIRECT_URL).toBe('immigrationrenewalhelp://reset-password')
	})

	test('normalizes Expo Router query values without accepting an empty token', () => {
		expect(firstSearchParam('token')).toBe('token')
		expect(firstSearchParam(['first', 'second'])).toBe('first')
		expect(firstSearchParam('')).toBeNull()
		expect(firstSearchParam([])).toBeNull()
		expect(firstSearchParam(undefined)).toBeNull()
	})

	test('matches Better Auth password bounds and requires confirmation', () => {
		expect(validateNewPassword('short', 'short')).toBe('Use at least 8 characters.')
		expect(validateNewPassword('x'.repeat(129), 'x'.repeat(129))).toBe(
			'Use no more than 128 characters.',
		)
		expect(validateNewPassword('new-password', 'different-password')).toBe(
			'The passwords do not match.',
		)
		expect(validateNewPassword('new-password', 'new-password')).toBeNull()
	})
})
