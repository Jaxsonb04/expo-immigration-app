import { authClient } from '@/lib/auth-client'

/**
 * The reactive session atom behind `authClient.useSession()` / `useConvexAuth()`,
 * reached through the client's private store — the public types don't surface it.
 * `refetch` lives on the atom's *value*; `subscribe` lives on the atom itself.
 */
type SessionAtomValue = {
	data?: { session?: unknown } | null
	isPending?: boolean
	refetch: (params?: { query?: { disableCookieCache?: boolean } }) => Promise<unknown>
}

type SessionAtom = {
	get: () => SessionAtomValue
	subscribe: (listener: (value: SessionAtomValue) => void) => () => void
}

function getSessionAtom(): SessionAtom {
	return (authClient.$store as unknown as { atoms: { session: SessionAtom } }).atoms.session
}

/**
 * The cookie header better-auth's expo plugin has persisted to secure storage
 * for the current session (`''` when signed out). Exposed by the expo plugin as
 * a client action; typed loosely here because the convex/expo client cast in
 * providers.tsx erases it from the public surface.
 */
export function getPersistedSessionCookie(): string {
	const client = authClient as unknown as { getCookie?: () => string }
	return client.getCookie?.() ?? ''
}

/** Whether the reactive atom currently reflects an authenticated session. */
export function getSessionSnapshot(): { hasSession: boolean; isPending: boolean } {
	const value = getSessionAtom().get()
	return { hasSession: !!value.data?.session, isPending: !!value.isPending }
}

/** Subscribe to reactive session changes; returns an unsubscribe function. */
export function subscribeToSession(listener: () => void): () => void {
	return getSessionAtom().subscribe(() => listener())
}

const SESSION_RESOLVE_ATTEMPTS = 12
const SESSION_RESOLVE_INTERVAL_MS = 200

/**
 * Force better-auth's reactive session atom to reflect a session that has
 * already been written to secure storage.
 *
 * Every sign-in path (`signIn.email`, `signIn.social`, `signIn.anonymous`,
 * `signUp.email`) persists the session cookie and then fires a single
 * `$sessionSignal` refetch. That refetch can lose a race with the cookie write,
 * or be aborted by an overlapping one, and settle the atom signed-out with
 * nothing to retrigger it — the app then sits on the sign-in screen even though
 * the server authenticated the request (a cold start reads the cookie fine).
 *
 * Re-drive the atom's own `refetch` (cookie cache bypassed) until it reflects
 * the persisted session, then notify once so the Convex provider fetches its
 * token. Bounded so a genuinely-signed-out caller still gets control back.
 * Returns whether a session is present when it finishes.
 */
export async function ensureSessionResolved(): Promise<boolean> {
	const atom = getSessionAtom()

	const settle = (): boolean => {
		if (!atom.get().data?.session) return false
		authClient.$store.notify('$sessionSignal')
		return true
	}

	for (let attempt = 0; attempt < SESSION_RESOLVE_ATTEMPTS; attempt += 1) {
		if (settle()) return true
		try {
			await atom.get().refetch({ query: { disableCookieCache: true } })
		} catch {
			// A refetch aborted by an overlapping one throws; the next attempt retries.
		}
		if (settle()) return true
		await new Promise((resolve) => setTimeout(resolve, SESSION_RESOLVE_INTERVAL_MS))
	}
	return false
}
