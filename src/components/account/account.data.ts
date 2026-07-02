import { useSyncExternalStore } from 'react'

/**
 * Props-driven recap of the effort a person has already invested, shown at the
 * top of the upgrade surface to motivate creating an account. Kept generic so
 * any caller (filing flow, document vault, …) can describe its own context.
 */
export type InvestedProgress = {
	/** Headline, e.g. "Save your progress". */
	title?: string
	/** Supporting sentence explaining why an account is worth it. */
	description?: string
	/** Short bullet highlights, e.g. "2 applicants", "3 documents uploaded". */
	highlights?: string[]
}

type GateRequest = {
	recap?: InvestedProgress
	resolve: (upgraded: boolean) => void
}

type Snapshot = {
	request: GateRequest | null
}

// Module-level singleton so `useRequireAccount()` works from any screen without
// requiring a specific provider to be mounted in the tree. The surface that
// presents the upgrade UI (the AccountGateProvider's bottom sheet, or the
// `/upgrade` modal screen) settles the pending request.
let snapshot: Snapshot = { request: null }
let surfaceCount = 0
const listeners = new Set<() => void>()

function notify(): void {
	for (const listener of listeners) {
		listener()
	}
}

export const accountGateStore = {
	subscribe(listener: () => void): () => void {
		listeners.add(listener)
		return () => {
			listeners.delete(listener)
		}
	},
	getSnapshot(): Snapshot {
		return snapshot
	},
	/** Whether an in-tree surface (AccountGateProvider) is hosting the sheet. */
	hasSurface(): boolean {
		return surfaceCount > 0
	},
	/** Registers a presenting surface; returns an unregister cleanup. */
	registerSurface(): () => void {
		surfaceCount += 1
		return () => {
			surfaceCount = Math.max(0, surfaceCount - 1)
		}
	},
	/**
	 * Opens a gate and returns a promise that resolves `true` once the account is
	 * upgraded, or `false` if the surface is dismissed. Any previously pending
	 * gate is settled as not-upgraded first.
	 */
	request(recap?: InvestedProgress): Promise<boolean> {
		snapshot.request?.resolve(false)
		return new Promise<boolean>((resolve) => {
			snapshot = { request: { recap, resolve } }
			notify()
		})
	},
	/** Settles the pending gate (true = upgraded/auto-resume, false = parked). */
	settle(upgraded: boolean): void {
		const current = snapshot.request
		if (!current) {
			return
		}
		snapshot = { request: null }
		notify()
		current.resolve(upgraded)
	},
}

/** Reactive access to the currently pending gate request (or null). */
export function useAccountGateRequest(): GateRequest | null {
	return useSyncExternalStore(accountGateStore.subscribe, accountGateStore.getSnapshot).request
}
