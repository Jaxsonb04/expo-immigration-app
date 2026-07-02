import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { accountGateStore, type InvestedProgress } from './account.data'
import { useAccountSession } from './account.session'

/**
 * The shared account gate. Returns a `requireAccount(recap?)` guard you can
 * `await` before any sensitive action:
 *
 * ```ts
 * const requireAccount = useRequireAccount()
 *
 * async function onSubmitFiling() {
 *   const ok = await requireAccount({
 *     title: 'Create an account to submit',
 *     highlights: ['1 applicant', '4 documents'],
 *   })
 *   if (!ok) return // dismissed → action parked, anonymous data kept
 *   await submitFiling() // auto-resumes here after a successful upgrade
 * }
 * ```
 *
 * Behaviour:
 * - Already credentialed → resolves `true` immediately (no prompt).
 * - Anonymous → opens the upgrade surface (the AccountGateProvider's bottom
 *   sheet if mounted, otherwise the `/upgrade` modal) and resolves `true` only
 *   after a successful anonymous → credentialed link; `false` if dismissed.
 *
 * The anonymous-created data is preserved by the upgrade itself (Better Auth
 * `onLinkAccount` → convex/account.ts), so the resumed action runs against the
 * same data under the new permanent account.
 */
export function useRequireAccount(): (recap?: InvestedProgress) => Promise<boolean> {
	const router = useRouter()
	const { isCredentialed } = useAccountSession()

	// Read the latest value inside the stable callback without re-creating it.
	const isCredentialedRef = useRef(isCredentialed)
	useEffect(() => {
		isCredentialedRef.current = isCredentialed
	}, [isCredentialed])

	return useCallback(
		async (recap?: InvestedProgress): Promise<boolean> => {
			if (isCredentialedRef.current) {
				return true
			}

			const upgraded = accountGateStore.request(recap)
			if (!accountGateStore.hasSurface()) {
				// No AccountGateProvider mounted to host the sheet — present the
				// registered `/upgrade` modal route, which settles the same gate.
				router.push('/upgrade')
			}
			return upgraded
		},
		[router],
	)
}
