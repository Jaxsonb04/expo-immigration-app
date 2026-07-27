export type AccountDeletionMode = 'loading' | 'credentialed' | 'temporary'

/**
 * Account deletion must default closed while Better Auth restores its session.
 * Treating an unknown user as temporary could purge app data before the
 * anonymous-only identity endpoint rejects a permanent account.
 */
export function resolveAccountDeletionMode(
	isPending: boolean,
	isCredentialed: boolean,
): AccountDeletionMode {
	if (isPending) return 'loading'
	return isCredentialed ? 'credentialed' : 'temporary'
}
