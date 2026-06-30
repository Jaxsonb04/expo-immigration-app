import { UpgradeScreen } from '@/components/account'

/**
 * Full-screen upgrade modal (registered as a root modal in `_layout.tsx`). Used
 * as the `useRequireAccount()` fallback surface when no `AccountGateProvider`
 * hosts the bottom sheet, and reachable directly (e.g. an account-tab "Create
 * account" action). The screen assembly lives in the account module; this route
 * is a thin wrapper.
 */
export default function UpgradeModal() {
	return <UpgradeScreen />
}
