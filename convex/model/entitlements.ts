// Monetization seam for the clean (un-watermarked) filing-package export.
//
// Product decision (2026-07): the app is free — every owner is entitled to the
// clean export, with no purchase anywhere. The entitlements table, its
// RevenueCat-shaped statuses/sources, and this check stay in place so
// monetization can be switched back on later by flipping the flag below (and
// re-adding purchase UI); nothing else should have to change server-side.

/** When true, every owner is treated as entitled to the clean export. */
export const CLEAN_EXPORT_FREE_FOR_EVERYONE = true

/**
 * Whether an owner may download the clean filing package for an application.
 * `hasActiveEntitlement` is the stored-entitlement signal (an active
 * `entitlements` row for the application); it is ignored while the app is
 * free for everyone.
 */
export function isEntitledToCleanExport(hasActiveEntitlement: boolean): boolean {
	return CLEAN_EXPORT_FREE_FOR_EVERYONE || hasActiveEntitlement
}
