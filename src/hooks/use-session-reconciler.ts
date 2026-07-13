import { useEffect, useRef } from 'react'

import {
	ensureSessionResolved,
	getPersistedSessionCookie,
	getSessionSnapshot,
	subscribeToSession,
} from '@/lib/session-sync'

/**
 * Root-level safety net for the "authenticated on the server, stranded
 * signed-out in the app" race (see `ensureSessionResolved`). Every sign-in call
 * site already drives the atom itself, but mounting this once at the root
 * guarantees recovery no matter which path created the session — including any
 * future sign-in that forgets to await `ensureSessionResolved`.
 *
 * Whenever the reactive session settles signed-out while a session cookie is
 * still persisted in secure storage, that's a stranded session, so re-drive the
 * refetch loop. Each distinct cookie is reconciled at most once (tracked by
 * value) so an expired/invalid cookie can't spin the loop forever, while a
 * fresh sign-in (new cookie) always earns a fresh attempt.
 */
export function useSessionReconciler(): void {
	const reconciledCookie = useRef<string | null>(null)

	useEffect(() => {
		const reconcile = () => {
			const { hasSession, isPending } = getSessionSnapshot()
			if (hasSession) {
				// Signed in — clear the guard so a later sign-out → sign-in reconciles.
				reconciledCookie.current = null
				return
			}
			if (isPending) return

			const cookie = getPersistedSessionCookie()
			if (!cookie) {
				// Genuinely signed out; nothing to recover.
				reconciledCookie.current = null
				return
			}
			if (cookie === reconciledCookie.current) return
			reconciledCookie.current = cookie
			void ensureSessionResolved()
		}

		reconcile()
		return subscribeToSession(reconcile)
	}, [])
}
