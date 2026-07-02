import { expoClient } from '@better-auth/expo/client'
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { anonymousClient } from 'better-auth/client/plugins'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

export const authClient = createAuthClient({
	baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
	plugins: [
		expoClient({
			scheme: Constants.expoConfig?.scheme as string,
			storagePrefix: Constants.expoConfig?.scheme as string,
			storage: SecureStore,
		}),
		// Matches the server-side `anonymous()` plugin in convex/auth.ts so
		// `authClient.signIn.anonymous()` is available and typed (ADR-0009).
		anonymousClient(),
		convexClient(),
	],
})
