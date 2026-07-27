import { RELEASE_FEATURES } from './release-policy'

export const PASSWORD_RECOVERY_ENABLED = RELEASE_FEATURES.passwordRecovery

export const PASSWORD_RESET_REDIRECT_URL = 'immigrationrenewalhelp://reset-password'

export function firstSearchParam(value: string | string[] | undefined): string | null {
	if (typeof value === 'string' && value.length > 0) return value
	if (Array.isArray(value) && value[0]) return value[0]
	return null
}

export function validateNewPassword(password: string, confirmation: string): string | null {
	if (password.length < 8) return 'Use at least 8 characters.'
	if (password.length > 128) return 'Use no more than 128 characters.'
	if (password !== confirmation) return 'The passwords do not match.'
	return null
}
