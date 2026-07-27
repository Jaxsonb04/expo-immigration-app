import type { BetterAuthOptions } from 'better-auth/minimal'
import releasePolicy from '../../release-policy.json'

type AuthEnvironment = Record<string, string | undefined>

/**
 * Social providers are server-gated by the same machine-readable policy as
 * the client. Credentials left in a deployment cannot silently re-enable an
 * unreviewed login method.
 */
export function socialProvidersForRelease(
	env: AuthEnvironment,
): NonNullable<BetterAuthOptions['socialProviders']> {
	const providers: NonNullable<BetterAuthOptions['socialProviders']> = {}
	if (!releasePolicy.socialLogin) return providers

	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
		providers.google = {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			redirectURI: 'https://auth.immifile.app/api/auth/callback/google',
		}
	}
	if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
		providers.apple = {
			clientId: env.APPLE_CLIENT_ID,
			clientSecret: env.APPLE_CLIENT_SECRET,
			appBundleIdentifier: 'dev.uing.immigrationrenewalhelp',
		}
	}
	return providers
}
