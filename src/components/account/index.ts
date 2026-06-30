// Public surface of the account module — the contextual account gate (ADR-0010)
// and the full-screen upgrade surface. Consumers import only from here: the app
// root mounts `AccountGateProvider`, sensitive actions await `useRequireAccount()`,
// and the `/upgrade` modal route renders `UpgradeScreen`. The gate store, bottom
// sheet, upgrade actions, invested-progress recap, and session hook stay internal
// to the module.
export { AccountGateProvider } from './account-gate-provider'
export { useRequireAccount } from './use-require-account'
export { UpgradeScreen } from './upgrade-screen'
export type { InvestedProgress } from './account-gate-store'
