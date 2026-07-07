import type { MutationCtx, QueryCtx } from '../_generated/server'

/**
 * The account holder's stable identity key. Derived from the authenticated
 * identity's `tokenIdentifier` (never from a client-supplied argument), so it
 * is safe to use for ownership scoping. Returns `null` when unauthenticated.
 */
export async function getOwnerId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
	const identity = await ctx.auth.getUserIdentity()
	return identity?.tokenIdentifier ?? null
}

/** Like {@link getOwnerId}, but throws when the caller is not authenticated. */
export async function requireOwnerId(ctx: QueryCtx | MutationCtx): Promise<string> {
	const ownerId = await getOwnerId(ctx)
	if (ownerId === null) {
		throw new Error('Not authenticated')
	}
	return ownerId
}

/**
 * The account holder's identity plus whether the session is anonymous (Better
 * Auth anonymous plugin, ADR-0009). `isAnonymous` is read from a JWT claim
 * surfaced on the Convex identity: the app's Better Auth `convex()` plugin uses
 * the default `definePayload`, which spreads the user record — including
 * `isAnonymous` — into the token, the same mechanism that surfaces `sessionId`.
 * `ownerId` is still `tokenIdentifier`, so it never depends on the claim.
 * Returns `null` when unauthenticated.
 */
export async function getAccountIdentity(
	ctx: QueryCtx | MutationCtx,
): Promise<{ ownerId: string; isAnonymous: boolean } | null> {
	const identity = await ctx.auth.getUserIdentity()
	if (identity === null) return null
	const isAnonymous = (identity as { isAnonymous?: boolean | null }).isAnonymous === true
	return { ownerId: identity.tokenIdentifier, isAnonymous }
}

/**
 * Require an authenticated, CREDENTIALED (non-anonymous) owner for a write.
 *
 * Composes {@link requireOwnerId}'s identity derivation with a separate
 * anonymity assertion, so the identity/ownership path never depends on the
 * `isAnonymous` claim: a missing/false claim can only ever ALLOW a write, never
 * wrongly block a real account. This duplicates the client account gate
 * (ADR-0010) on the server because the community forum is a public write
 * surface where a client-only gate is bypassable — see ADR-0010's 2026-07-06
 * amendment.
 */
export async function requireCredentialedOwnerId(ctx: QueryCtx | MutationCtx): Promise<string> {
	const account = await getAccountIdentity(ctx)
	if (account === null) throw new Error('Not authenticated')
	if (account.isAnonymous) {
		throw new Error('Create a free account to take part in the community')
	}
	return account.ownerId
}
