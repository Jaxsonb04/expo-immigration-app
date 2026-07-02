import { authClient } from '@/lib/auth-client'

/**
 * Narrow view over the Better Auth session for account-gating decisions.
 *
 * `isCredentialed` is the signal the gate cares about: an anonymous session is
 * authenticated (so `useConvexAuth().isAuthenticated` is true and the app lets
 * the person in), but it is NOT a permanent account, so sensitive actions must
 * upgrade first. The anonymous plugin sets `isAnonymous` on the user.
 */
export function useAccountSession() {
	const { data, isPending } = authClient.useSession()
	const user = data?.user
	const isAnonymous = Boolean(user?.isAnonymous)

	return {
		user,
		isPending,
		isAnonymous,
		/** Signed in with permanent credentials (email/social), not anonymous. */
		isCredentialed: Boolean(user) && !isAnonymous,
	}
}
