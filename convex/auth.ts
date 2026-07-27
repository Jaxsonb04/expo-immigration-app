import { expo } from '@better-auth/expo'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'
import { anonymous } from 'better-auth/plugins'
import { v } from 'convex/values'
import { components, internal } from './_generated/api'
import { DataModel } from './_generated/dataModel'
import { internalAction, query } from './_generated/server'
import { purgeOwnerDataInBatches } from './account'
import authConfig from './auth.config'
import { authEmailWebhookConfig, sendPasswordResetEmail } from './shared/authEmail'
import { CONVEX_JWT_EXPIRATION_SECONDS } from './shared/authSecurity'
import { socialProvidersForRelease } from './shared/socialProviders'

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	// Convex exposes deployment env vars on `process.env` at runtime, but the
	// convex/ tsconfig ships no Node typings — read through globalThis to stay
	// typed without pulling in @types/node.
	const env =
		(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
	const socialProviders = socialProvidersForRelease(env)
	const authEmail = authEmailWebhookConfig(env)

	return betterAuth({
		// Must match the app scheme in app.json (used for deep-link auth callbacks).
		trustedOrigins: ['immigrationrenewalhelp://', 'https://auth.immifile.app'],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			resetPasswordTokenExpiresIn: 60 * 60,
			revokeSessionsOnPasswordReset: true,
			...(authEmail
				? {
						sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
							await sendPasswordResetEmail(authEmail, {
								to: user.email,
								resetUrl: url,
							})
						},
					}
				: {}),
		},
		// Account deletion is a complete server-side operation: app-owned rows and
		// stored files are purged first, then Better Auth removes the user, linked
		// accounts, and sessions. Credentialed clients provide the account password;
		// temporary accounts use the anonymous plugin's dedicated deletion endpoint
		// after explicitly purging their app-owned data.
		user: {
			deleteUser: {
				enabled: true,
				beforeDelete: async (user) => {
					const siteUrl = env.CONVEX_SITE_URL
					if (!siteUrl) throw new Error('CONVEX_SITE_URL is not set; cannot delete account data')
					if (!('runMutation' in ctx)) {
						throw new Error('Account deletion ran outside an action context; data not deleted')
					}
					await purgeOwnerDataInBatches(ctx, `${siteUrl}|${user.id}`)
				},
			},
		},
		socialProviders,
		plugins: [
			expo(),
			anonymous({
				// M6-T3 data carryover: when a temporary first-run session
				// creates (or signs into) a permanent account, move every app-owned
				// row to the new owner id BEFORE the plugin deletes the anonymous
				// user. Owner ids are `${CONVEX_SITE_URL}|${betterAuthUserId}` — the
				// same tokenIdentifier convex/lib/auth.ts derives for every write.
				// If carryover fails, fail this hook rather than knowingly continue
				// with app data under the old owner. Better Auth component writes are
				// not assumed to roll back across this boundary; recovery/merge
				// semantics for an existing credential remain a separate decision.
				onLinkAccount: async ({ anonymousUser, newUser }) => {
					const siteUrl = env.CONVEX_SITE_URL
					if (!siteUrl) throw new Error('CONVEX_SITE_URL is not set; cannot carry data over')
					const fromId = anonymousUser.user.id
					const toId = newUser.user.id
					if (!fromId || !toId || fromId === toId) return
					if (!('runMutation' in ctx)) {
						throw new Error('Account linking ran outside an action context; data not moved')
					}
					await ctx.runMutation(internal.account.reassignAccountData, {
						fromOwnerId: `${siteUrl}|${fromId}`,
						toOwnerId: `${siteUrl}|${toId}`,
					})
				},
			}),
			convex({
				authConfig,
				jwt: { expirationSeconds: CONVEX_JWT_EXPIRATION_SECONDS },
			}),
		],
	})
}

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return authComponent.getAuthUser(ctx)
	},
})

/**
 * Non-throwing identity probe for the anonymous → permanent account handoff.
 * The client waits for this server view to match its Better Auth session before
 * auto-resuming a sensitive action, so the resumed mutation uses the new owner.
 */
export const getAccountStatus = query({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			userId: v.string(),
			isAnonymous: v.boolean(),
		}),
	),
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx)
		if (user === undefined) return null
		const rawUser = user as { _id?: unknown; id?: unknown; isAnonymous?: unknown }
		const userId = rawUser._id ?? rawUser.id
		if (typeof userId !== 'string') return null
		return { userId, isAnonymous: rawUser.isAnonymous === true }
	},
})

/**
 * One-shot repair: deletes the stored JWKS and regenerates it under the
 * deployment's current `BETTER_AUTH_SECRET`. Needed after the secret changes
 * (or a deployment is restored/cloned), because the existing signing key is
 * encrypted with the old secret — every `/convex/token` request then fails
 * with "Failed to decrypt private key" and no session ever authenticates.
 * Run once via `npx convex run auth:rotateKeys`.
 */
export const rotateKeys = internalAction({
	args: {},
	handler: async (ctx) => {
		const auth = createAuth(ctx)
		return await auth.api.rotateKeys()
	},
})
