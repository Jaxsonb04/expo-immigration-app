type ClientAccount = {
	id?: string | null
	isAnonymous?: boolean | null
}

export type ServerAccountStatus = {
	userId: string
	isAnonymous: boolean
}

/**
 * A local Better Auth session can update one render before Convex installs its
 * new JWT. Sensitive actions may resume only when both clients identify the
 * same non-anonymous user; otherwise a post-conversion write could still use
 * the retired temporary owner.
 */
export function isCredentialedAccountReady(
	client: ClientAccount | null | undefined,
	server: ServerAccountStatus | null | undefined,
): boolean {
	const clientUserId = client?.id
	return (
		typeof clientUserId === 'string' &&
		clientUserId.length > 0 &&
		client?.isAnonymous !== true &&
		server !== null &&
		server !== undefined &&
		server.userId === clientUserId &&
		server.isAnonymous === false
	)
}
