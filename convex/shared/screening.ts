import type { ApplicationKind, I90CardStatus } from './applicationShapes'
import { i90CardStatuses } from './applicationShapes'

// Deterministic eligibility screening (workflow-repair slice 2): the ONE place
// that decides whether a situation is honestly supported before an application
// exists. Both entry points — the new-application modal AND the assistant's
// "Start this form" deep link — funnel into createApplication, which enforces
// these rules server-side, so no flow can bypass them. The client imports the
// same functions to explain a stop before the user hits the server error.
//
// Rules are grounded in the official Form I-90 (edition 2025-02-27, whose own
// Part 2 note reads "If your conditional permanent resident status ... is
// expiring within the next 90 days, then do not file this application") and
// the USCIS I-90/I-765 instructions. Do not loosen a rule here without
// re-verifying against the current official sources.

export type ScreeningStop = {
	supported: false
	title: string
	explanation: string
	officialLinks: readonly { label: string; url: string }[]
}

export type ScreeningResult = { supported: true } | ScreeningStop

export function isI90CardStatus(value: unknown): value is I90CardStatus {
	return typeof value === 'string' && (i90CardStatuses as readonly string[]).includes(value)
}

const CONDITIONAL_RENEWAL_STOP: ScreeningStop = {
	supported: false,
	title: "A 2-year conditional card can't be renewed with Form I-90",
	explanation:
		'A 2-year card means you are a conditional permanent resident. USCIS does not renew an ' +
		'expiring conditional card with Form I-90 — you generally file Form I-751 (Petition to ' +
		'Remove Conditions on Residence) or Form I-829 (for entrepreneurs) in the 90 days before ' +
		"it expires. This app doesn't prepare those forms, so it can't start this application. " +
		'If your conditional card was lost, stolen, or damaged, you can start a replacement instead.',
	officialLinks: [
		{ label: 'Form I-751 (remove conditions) →', url: 'https://www.uscis.gov/i-751' },
		{ label: 'Form I-829 (entrepreneurs) →', url: 'https://www.uscis.gov/i-829' },
		{ label: 'Official Form I-90 page →', url: 'https://www.uscis.gov/i-90' },
	],
}

/**
 * Screen an I-90 situation by card/status. The only blocked combination is a
 * conditional resident renewing an expiring 2-year card; the printed form has
 * no such reason box (Section B offers replacement reasons only) and USCIS
 * directs those applicants to I-751/I-829.
 */
export function screenI90(
	cardStatus: I90CardStatus,
	applicationKind: ApplicationKind,
): ScreeningResult {
	if (cardStatus === 'conditionalResident' && applicationKind === 'renewal') {
		return CONDITIONAL_RENEWAL_STOP
	}
	return { supported: true }
}

// The I-765 eligibility categories this app prepares, end to end. This is the
// SINGLE source: the interview picker offers exactly these (plus a "not
// listed" stop), and the server refuses to mark the eligibility step complete
// for anything else. Expanding this list is a product-scope decision — each
// new category needs its evidence/companion-form contract first.
export const supportedI765Categories = [
	'C08',
	'C09',
	'C10',
	'C33',
	'A05',
	'A03',
	'A17',
	'C26',
] as const

export function isSupportedI765Category(value: unknown): boolean {
	return typeof value === 'string' && (supportedI765Categories as readonly string[]).includes(value)
}

/** Picker value for "my category isn't listed" — never a valid category. */
export const I765_CATEGORY_NOT_LISTED = 'notListed'

export const I765_CATEGORY_STOP: ScreeningStop = {
	supported: false,
	title: "This app doesn't prepare that category yet",
	explanation:
		'Form I-765 has dozens of eligibility categories, each with its own evidence and, ' +
		'sometimes, companion forms. This app currently prepares only the categories listed ' +
		'above. Filing under the wrong category can get an application rejected, so we won’t ' +
		'guess — check the official Form I-765 instructions for your category and how to file it.',
	officialLinks: [{ label: 'Official Form I-765 page →', url: 'https://www.uscis.gov/i-765' }],
}
