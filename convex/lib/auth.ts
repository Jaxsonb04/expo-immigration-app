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
