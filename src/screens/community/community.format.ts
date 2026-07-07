import type { ReportReason } from '@convex/shared/community'

// Pure, dependency-light presentation helpers for the community forum, kept out
// of community.data.ts so they can be unit-tested (that module pulls in
// convex/react, which the vitest edge runtime can't import — see M1-T4).

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/**
 * A compact relative time like "just now", "5m ago", "3h ago", "2d ago", and an
 * absolute short date beyond a week. `now` is passed in for testability.
 */
export function formatRelativeTime(ms: number, now: number): string {
	const diff = Math.max(0, now - ms)
	if (diff < MINUTE) return 'just now'
	if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
	if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`
	return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Up to two initials for a pseudonym avatar: the handle's uppercase humps
 * (QuietSparrow492 → "QS"), else its first two characters. */
export function handleInitials(handle: string): string {
	const trimmed = handle.trim()
	if (trimmed.length === 0) return '?'
	const uppers = trimmed.match(/[A-Z]/g)
	if (uppers && uppers.length >= 2) return `${uppers[0]}${uppers[1]}`
	return trimmed.slice(0, 2).toUpperCase()
}

/** "12 comments" / "1 comment" / "No comments yet". */
export function commentCountLabel(count: number): string {
	if (count === 0) return 'No comments yet'
	return `${count} ${count === 1 ? 'comment' : 'comments'}`
}

/** User-facing labels for the report reasons (backend `reportReasons`). */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
	spam: 'Spam',
	harassment: 'Harassment',
	misinformation: 'Misinformation',
	legalAdvice: 'Legal advice',
	other: 'Something else',
}
