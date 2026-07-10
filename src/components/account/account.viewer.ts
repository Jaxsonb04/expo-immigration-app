import { useAccountSession } from './account.session'

/**
 * Single source of truth for who is looking at the screen (M6-T1) — the
 * personalization spine every greeting and welcome moment reads from.
 *
 * - `isTemp`: the session is an anonymous Better Auth session ("Start
 *   filing"). Temp viewers stay unpersonalized — neutral copy, never a name.
 * - `firstName`: known only after conversion to a real account, from the
 *   Better Auth user's display name. `null` for temp sessions or when the
 *   account has no usable name (some social profiles) — callers must render
 *   their neutral variant in that case.
 */
export function useViewer(): {
	isTemp: boolean
	firstName: string | null
	isPending: boolean
} {
	const { user, isPending, isAnonymous, isCredentialed } = useAccountSession()
	const rawName = isCredentialed ? user?.name?.trim() : undefined
	return {
		isTemp: Boolean(user) && isAnonymous,
		firstName: rawName ? rawName.split(/\s+/)[0] : null,
		isPending,
	}
}
