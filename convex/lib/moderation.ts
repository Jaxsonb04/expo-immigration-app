import { env } from '../_generated/server'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { parseModeratorEmails } from '../shared/community'
import { requireCredentialedOwnerId } from './auth'

// Moderator authorization (M4-T3). A moderator is a CREDENTIALED account whose
// verified identity email appears in the MODERATOR_EMAILS deployment env var
// (comma-separated, case-insensitive, trimmed):
//   npx convex env set MODERATOR_EMAILS "mod@immifile.test"
// The email is read from the caller's JWT identity — NEVER from a client
// argument and NEVER from a client-supplied role flag — so moderation rights
// can only be granted by an operator with deployment access.

/**
 * The caller's identity email, lowercased, or null when the identity carries no
 * usable email (anonymous Better Auth sessions have none).
 */
async function getIdentityEmail(ctx: QueryCtx | MutationCtx): Promise<string | null> {
	const identity = await ctx.auth.getUserIdentity()
	const email = identity?.email?.trim().toLowerCase()
	return email !== undefined && email.length > 0 ? email : null
}

/**
 * Whether the current caller is a moderator. NEVER throws — unauthenticated,
 * anonymous, email-less, and unlisted callers are all simply `false`, so this
 * is safe to expose as a public query for UI gating.
 */
export async function isModeratorIdentity(ctx: QueryCtx | MutationCtx): Promise<boolean> {
	const identity = await ctx.auth.getUserIdentity()
	if (identity === null) return false
	if ((identity as { isAnonymous?: boolean | null }).isAnonymous === true) return false
	const email = await getIdentityEmail(ctx)
	if (email === null) return false
	return parseModeratorEmails(env.MODERATOR_EMAILS).includes(email)
}

/**
 * Require a moderator for a moderation read/write. Composes
 * {@link requireCredentialedOwnerId} (identity + non-anonymous, the same gate
 * every forum write uses) with the email-allowlist assertion. Returns the
 * moderator's ownerId. The failure message never reveals whether the target
 * feature exists for other roles.
 */
export async function requireModerator(ctx: QueryCtx | MutationCtx): Promise<string> {
	const ownerId = await requireCredentialedOwnerId(ctx)
	const email = await getIdentityEmail(ctx)
	if (email === null || !parseModeratorEmails(env.MODERATOR_EMAILS).includes(email)) {
		throw new Error('Not authorized')
	}
	return ownerId
}
