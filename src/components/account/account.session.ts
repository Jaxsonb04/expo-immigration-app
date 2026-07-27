import { isCredentialedAccountReady } from '@/lib/account-upgrade-readiness'
import { authClient } from '@/lib/auth-client'
import { api } from '@convex/_generated/api'
import { useQuery } from 'convex/react'

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

/**
 * Server-confirmed credential state for sensitive-action gates. Better Auth's
 * local session can publish before Convex has installed the corresponding JWT,
 * so local `isCredentialed` alone is not enough to safely auto-resume a write.
 */
export function useCredentialedAccountReadiness() {
	const session = useAccountSession()
	const serverAccount = useQuery(api.auth.getAccountStatus, session.isCredentialed ? {} : 'skip')
	return {
		...session,
		isCredentialedReady: isCredentialedAccountReady(session.user, serverAccount),
	}
}
