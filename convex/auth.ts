import { expo } from '@better-auth/expo'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal'
import { anonymous } from 'better-auth/plugins'
import { components, internal } from './_generated/api'
import { DataModel } from './_generated/dataModel'
import { internalAction, query } from './_generated/server'
import authConfig from './auth.config'

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	// Social providers are enabled only when their OAuth credentials are present
	// in the Convex deployment env (set via `npx convex env set`). Until then the
	// SocialAuthButtons on the auth screen surface a "provider not configured"
	// error; email/password works without any of this.
	// Convex exposes deployment env vars on `process.env` at runtime, but the
	// convex/ tsconfig ships no Node typings — read through globalThis to stay
	// typed without pulling in @types/node.
	const env =
		(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

	// Google is the only social provider we ship today; Apple is planned next.
	// GitHub is intentionally omitted — a developer identity provider is a poor
	// fit for this app's audience (immigrants filing USCIS paperwork).
	const socialProviders: NonNullable<BetterAuthOptions['socialProviders']> = {}
	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
		socialProviders.google = {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			redirectURI: 'https://auth.immifile.app/api/auth/callback/google',
		}
	}
	if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
		socialProviders.apple = {
			clientId: env.APPLE_CLIENT_ID,
			clientSecret: env.APPLE_CLIENT_SECRET,
			// Verifies native Sign in with Apple id tokens from expo-apple-authentication.
			appBundleIdentifier: "dev.uing.immigrationrenewalhelp",
		}
	}

	return betterAuth({
		// Must match the app scheme in app.json (used for deep-link auth callbacks).
		trustedOrigins: ['immigrationrenewalhelp://', 'https://auth.immifile.app'],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		socialProviders,
		plugins: [
			expo(),
			anonymous({
				// M6-T3 data carryover: when an anonymous "Start filing" session
				// creates (or signs into) a permanent account, move every app-owned
				// row to the new owner id BEFORE the plugin deletes the anonymous
				// user. Owner ids are `${CONVEX_SITE_URL}|${betterAuthUserId}` — the
				// same tokenIdentifier convex/lib/auth.ts derives for every write.
				// A failure here aborts the link (the anonymous session survives and
				// the user can retry) — that is strictly better than completing a
				// link that silently orphans their filing.
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
			convex({ authConfig }),
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
