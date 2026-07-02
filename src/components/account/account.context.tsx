import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { accountGateStore, useAccountGateRequest } from './account.data'
import { UpgradeSheet } from './upgrade'

/**
 * Optional app-root provider that hosts the contextual upgrade bottom sheet.
 *
 * Mount it once near the root (e.g. inside `Providers`) so `useRequireAccount()`
 * opens an in-place bottom sheet. When it is NOT mounted, `useRequireAccount()`
 * falls back to navigating to the already-registered `/upgrade` modal route, so
 * the gate still works end-to-end either way.
 */
export function AccountGateProvider({ children }: { children: ReactNode }) {
	const request = useAccountGateRequest()

	// Advertise this surface so `useRequireAccount()` prefers the in-place sheet
	// over the `/upgrade` modal fallback while the provider is mounted.
	useEffect(() => accountGateStore.registerSurface(), [])

	return (
		<>
			{children}
			<UpgradeSheet
				isOpen={request !== null}
				recap={request?.recap}
				onUpgraded={() => accountGateStore.settle(true)}
				onDismiss={() => accountGateStore.settle(false)}
			/>
		</>
	)
}
