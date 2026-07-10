/**
 * Temp-account lifecycle boundary (M6-T4). An anonymous "Start filing" session
 * is kept for 48 hours from creation; if it never converts to a permanent
 * account it is permanently deleted (app data cascade + Better Auth records).
 *
 * Pure and dependency-free so the deletion boundary is unit-testable and the
 * client can compute the same deadline for its warning copy.
 */
export const TEMP_ACCOUNT_RETENTION_MS = 48 * 60 * 60 * 1000

/** The client starts warning inside this window before the deadline. */
export const TEMP_ACCOUNT_WARNING_MS = 24 * 60 * 60 * 1000

export type TempAccountUser = {
	isAnonymous?: boolean | null
	createdAt?: number | string | Date | null
}

/**
 * `createdAt` in milliseconds, whatever the storage representation, or `null`
 * when absent/unparseable. A `null` age must always mean "keep".
 */
export function tempAccountCreatedAtMs(user: TempAccountUser): number | null {
	const raw = user.createdAt
	if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
	if (raw instanceof Date) return Number.isFinite(raw.getTime()) ? raw.getTime() : null
	if (typeof raw === 'string') {
		const parsed = Date.parse(raw)
		return Number.isNaN(parsed) ? null : parsed
	}
	return null
}

/**
 * The single deletion predicate: ONLY a still-anonymous account strictly older
 * than the retention window is expired. Anything ambiguous — a credentialed or
 * linked account (`isAnonymous` not exactly `true`), a missing/unparseable
 * creation time — is never eligible. The cleanup action re-checks every
 * candidate against this immediately before deleting it.
 */
export function isExpiredTempAccount(user: TempAccountUser, now: number): boolean {
	if (user.isAnonymous !== true) return false
	const createdAt = tempAccountCreatedAtMs(user)
	if (createdAt === null) return false
	return now - createdAt > TEMP_ACCOUNT_RETENTION_MS
}
