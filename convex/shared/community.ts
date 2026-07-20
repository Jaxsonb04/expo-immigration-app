// Single-source, dependency-light literals + validators for the community
// forum (M4-T1). Shared so the schema, the Convex backend, and the M4-T2 UI
// validate identically. Pure module — no Convex imports — so it is unit-tested
// directly (see community.test.ts) the way applicationShapes' receipt helpers
// are.

// Moderation lifecycle. Only `visible` content is ever returned by a public
// read. `hidden` is a moderator action (M4-T3); `removed` is an author delete
// (tombstone). Both non-visible states are excluded from every public surface.
export const moderationStatuses = ['visible', 'hidden', 'removed'] as const
export type ModerationStatus = (typeof moderationStatuses)[number]

export const reportReasons = [
	'spam',
	'harassment',
	'misinformation',
	'legalAdvice',
	'other',
] as const
export type ReportReason = (typeof reportReasons)[number]

// Report lifecycle (M4-T3). `open` = awaiting moderator review. A moderator
// closes a report as `resolved` (action was taken — usually a hide) or
// `dismissed` (nothing wrong). `reviewed` is the deprecated M4-T1 catch-all,
// kept only so any pre-M4-T3 rows still satisfy the schema; nothing writes it.
export const reportStatuses = ['open', 'reviewed', 'resolved', 'dismissed'] as const
export type ReportStatus = (typeof reportStatuses)[number]

// The two closed states a moderator can pick (a report can never be re-opened
// to `open` via resolveReport, and `reviewed` is write-retired).
export const reportResolutions = ['resolved', 'dismissed'] as const
export type ReportResolution = (typeof reportResolutions)[number]

export const reportTargetTypes = ['post', 'comment'] as const
export type ReportTargetType = (typeof reportTargetTypes)[number]

// Text bounds (trimmed length in UTF-16 code units).
export const POST_TITLE_MAX = 120
export const POST_BODY_MAX = 10_000
export const COMMENT_BODY_MAX = 10_000
export const REPORT_NOTE_MAX = 500

// Public-read page bounds. Every public list clamps the client-requested
// numItems into [1, MAX_PAGE_SIZE] so an unauthenticated caller can never force
// an unbounded page ("public reads are bounded", M4-T1).
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50

export function clampPageSize(requested: number | undefined): number {
	if (requested === undefined || !Number.isFinite(requested)) return DEFAULT_PAGE_SIZE
	return Math.min(Math.max(Math.floor(requested), 1), MAX_PAGE_SIZE)
}

// Handles are public pseudonyms: 3–20 chars, letters/digits/underscore only.
export const HANDLE_MIN = 3
export const HANDLE_MAX = 20
export const HANDLE_RE = /^[A-Za-z0-9_]+$/

export function normalizeHandle(raw: string): string {
	return raw.trim()
}

export function isValidHandle(handle: string): boolean {
	return handle.length >= HANDLE_MIN && handle.length <= HANDLE_MAX && HANDLE_RE.test(handle)
}

/**
 * Trim and enforce a required, length-bounded text field. Returns the trimmed
 * value or throws a user-facing error. Rejects whitespace-only input so a
 * "1-char min" can't be satisfied by a space.
 */
export function requireText(raw: string, max: number, label: string): string {
	const value = raw.trim()
	if (value.length === 0) throw new Error(`${label} is required`)
	if (value.length > max) throw new Error(`${label} must be ${max} characters or fewer`)
	return value
}

/** Trim an optional text field; empty-after-trim collapses to undefined. */
export function optionalText(
	raw: string | undefined,
	max: number,
	label: string,
): string | undefined {
	if (raw === undefined) return undefined
	const value = raw.trim()
	if (value.length === 0) return undefined
	if (value.length > max) throw new Error(`${label} must be ${max} characters or fewer`)
	return value
}

// Friendly, non-identifying word lists for auto-generated pseudonyms. Kept ≤8
// chars each so adjective+noun+≤3 digits always fits HANDLE_MAX.
const HANDLE_ADJECTIVES = [
	'Quiet',
	'Brave',
	'Calm',
	'Kind',
	'Swift',
	'Bright',
	'Gentle',
	'Bold',
	'Sunny',
	'Clever',
	'Merry',
	'Steady',
	'Warm',
	'Noble',
	'Lucky',
	'Hopeful',
] as const

const HANDLE_NOUNS = [
	'Sparrow',
	'River',
	'Maple',
	'Harbor',
	'Willow',
	'Falcon',
	'Cedar',
	'Meadow',
	'Lantern',
	'Compass',
	'Beacon',
	'Anchor',
	'Summit',
	'Cricket',
	'Robin',
	'Pine',
] as const

/**
 * A friendly pseudonym like `QuietSparrow492`. `seed` (e.g. Date.now()) and
 * `salt` (a retry index) vary the pick so `ensureProfile` can retry on a handle
 * collision. Result is always a valid handle.
 */
export function generateHandle(seed: number, salt: number): string {
	const adjective = HANDLE_ADJECTIVES[Math.abs(seed + salt * 7) % HANDLE_ADJECTIVES.length]!
	const noun = HANDLE_NOUNS[Math.abs(seed * 3 + salt * 13) % HANDLE_NOUNS.length]!
	const digits = Math.abs((seed * 31 + salt * 101) % 1000)
	return `${adjective}${noun}${digits}`
}

/** Stable dedupe/lookup key for a report target, spanning both target tables. */
export function targetKeyFor(targetType: ReportTargetType, targetId: string): string {
	return `${targetType === 'post' ? 'p' : 'c'}:${targetId}`
}

/**
 * Invert {@link targetKeyFor}: recover the raw document id from a targetKey.
 * Returns null for a malformed key (wrong prefix / empty id) so callers treat
 * garbage the same as a missing target instead of throwing.
 */
export function targetIdFromKey(targetType: ReportTargetType, targetKey: string): string | null {
	const prefix = targetType === 'post' ? 'p:' : 'c:'
	if (!targetKey.startsWith(prefix)) return null
	const id = targetKey.slice(prefix.length)
	return id.length > 0 ? id : null
}

// Moderator allowlist parsing (M4-T3). The MODERATOR_EMAILS deployment env var
// is a comma-separated, case-insensitive list of account emails. Pure so it is
// unit-testable; the trust boundary (reading the caller's email from the JWT,
// never from an argument) lives in convex/lib/moderation.ts.
export function parseModeratorEmails(raw: string | undefined): string[] {
	if (raw === undefined) return []
	return raw
		.split(',')
		.map((email) => email.trim().toLowerCase())
		.filter((email) => email.length > 0)
}

// Per-viewer block list bound: enough for any real user while keeping the feed
// filter's read fan-out bounded (public reads must stay bounded, M4-T1).
export const MAX_BLOCKS_PER_OWNER = 200
