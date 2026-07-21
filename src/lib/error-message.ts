/**
 * The human sentence out of a server error, for user-facing alerts.
 *
 * Convex wraps a mutation's thrown message in transport noise —
 * `[CONVEX M(applications:markFiled)] [Request ID: …] Server Error
 * Uncaught Error: <the actual sentence> at handler (../convex/foo.ts:1:2)` —
 * which must never reach an Alert. This extracts the sentence the server
 * actually wrote, and falls back to the provided copy for anything that
 * doesn't carry a usable message (network failures, non-Error throws).
 */
export function humanErrorMessage(
	error: unknown,
	fallback = 'Something went wrong. Please try again.',
): string {
	if (!(error instanceof Error) || error.message.trim() === '') return fallback

	let message = error.message
	const uncaughtMarker = message.match(/Uncaught (?:Convex)?Error:\s*/)
	if (uncaughtMarker !== null) {
		message = message.slice(message.indexOf(uncaughtMarker[0]) + uncaughtMarker[0].length)
	} else {
		// No Uncaught marker: still strip any leading [CONVEX …]/[Request ID: …]
		// brackets and the "Server Error" label a Convex failure may carry.
		message = message.replace(/^(?:\s*\[[^\]]*\])*\s*(?:Server Error\s*)?/, '')
	}
	// Drop the trailing stack-location Convex appends to uncaught errors.
	message = message.replace(/\s+at handler \([^)]*\)\s*$/, '').trim()

	return message === '' ? fallback : message
}
