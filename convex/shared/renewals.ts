// M6-T6 renewal-window math. Pure and dependency-free so the boundary is
// unit-tested once and shared by server and client.
//
// Filing windows (verified on uscis.gov, 2026-07-09):
// - I-765 (EAD) renewal: file up to 180 days before the current card expires
//   ("Generally, you should not file for a renewal EAD more than 180 days
//   before your original EAD expires" — uscis.gov/i-765; USCIS Policy Manual
//   Vol. 10 Pt. A Ch. 4).
// - I-90 (green card) renewal: file within six months of expiration; if the
//   card has already expired, file immediately (uscis.gov "Replace Your Green
//   Card"). Six months is treated as the same 180-day window here.
export const RENEWAL_WINDOW_DAYS = 180

const DAY_MS = 24 * 60 * 60 * 1000

export type RenewalKind = 'ead' | 'greenCard'

export type RenewalState =
	| { status: 'expired'; daysSinceExpiry: number }
	| { status: 'windowOpen'; daysUntilExpiry: number }
	| { status: 'windowOpens'; opensOn: string; daysUntilExpiry: number }
	| { status: 'awaitingCard'; filedOn: string }

function parseIsoDate(value: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
	const ms = Date.parse(`${value}T00:00:00Z`)
	return Number.isNaN(ms) ? null : ms
}

export function isoDateOnly(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Where a document stands relative to its USCIS renewal filing window.
 * `null` when there is nothing to compute (no usable dates).
 */
export function renewalStateFor(
	item: { expiryDate?: string; filedAt?: string },
	todayIso: string,
): RenewalState | null {
	const today = parseIsoDate(todayIso)
	if (today === null) return null

	if (item.expiryDate !== undefined) {
		const expiry = parseIsoDate(item.expiryDate)
		if (expiry !== null) {
			const daysUntilExpiry = Math.round((expiry - today) / DAY_MS)
			if (daysUntilExpiry < 0) return { status: 'expired', daysSinceExpiry: -daysUntilExpiry }
			if (daysUntilExpiry <= RENEWAL_WINDOW_DAYS) return { status: 'windowOpen', daysUntilExpiry }
			return {
				status: 'windowOpens',
				opensOn: isoDateOnly(expiry - RENEWAL_WINDOW_DAYS * DAY_MS),
				daysUntilExpiry,
			}
		}
	}
	if (item.filedAt !== undefined && parseIsoDate(item.filedAt) !== null) {
		return { status: 'awaitingCard', filedOn: item.filedAt }
	}
	return null
}

export function isValidIsoDate(value: string): boolean {
	return parseIsoDate(value) !== null
}
