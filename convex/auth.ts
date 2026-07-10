import { expo } from '@better-auth/expo'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal'
import { anonymous } from 'better-auth/plugins'
import { components } from './_generated/api'
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
		trustedOrigins: ['immigrationrenewalhelp://'],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		socialProviders,
		plugins: [
			expo(),
			anonymous(),
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
