type AuthTransitionOptions = {
	isAuthenticated: () => boolean
	isMounted: () => boolean
	timeoutMs?: number
	pollIntervalMs?: number
}

/**
 * Wait for the route guard's real success condition instead of assuming that a
 * Better Auth session also means Convex has accepted its JWT.
 */
export async function waitForAuthenticatedOrUnmounted({
	isAuthenticated,
	isMounted,
	timeoutMs = 5_000,
	pollIntervalMs = 50,
}: AuthTransitionOptions): Promise<boolean> {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (!isMounted() || isAuthenticated()) return true
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
	}
	return !isMounted() || isAuthenticated()
}
