import { useEffect, useRef } from 'react'

import {
	ensureSessionResolved,
	getPersistedSessionCookie,
	getSessionSnapshot,
	subscribeToSession,
} from '@/lib/session-sync'
import { createSessionReconcileScheduler } from '@/lib/session-reconciliation'

/**
 * Root-level safety net for the "authenticated on the server, stranded
 * signed-out in the app" race (see `ensureSessionResolved`). Every sign-in call
 * site already drives the atom itself, but mounting this once at the root
 * guarantees recovery no matter which path created the session — including any
 * future sign-in that forgets to await `ensureSessionResolved`.
 *
 * Revalidate every distinct persisted cookie once, even when the reactive atom
 * already contains a session. The Expo plugin can hydrate that atom from a
 * separate local session cache after the cookie itself has become invalid; in
 * that split-brain state, accepting `hasSession` without a server refetch keeps
 * Convex unauthenticated forever.
 *
 * A session with no cookie is also revalidated once so the stale local cache is
 * cleared. Keys are deduplicated so an expired/invalid cookie cannot spin the
 * loop forever, while a fresh sign-in cookie always earns a new attempt.
 */
export function useSessionReconciler(): void {
	const mountedRef = useRef(false)

	useEffect(() => {
		mountedRef.current = true
		const reconcile = createSessionReconcileScheduler({
			getSnapshot: getSessionSnapshot,
			getCookie: getPersistedSessionCookie,
			resolveSession: ensureSessionResolved,
		})
		const notify = () => {
			if (mountedRef.current) void reconcile()
		}

		notify()
		const unsubscribe = subscribeToSession(notify)
		return () => {
			mountedRef.current = false
			unsubscribe()
		}
	}, [])
}
