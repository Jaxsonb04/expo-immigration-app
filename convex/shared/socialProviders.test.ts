import { describe, expect, test } from 'vitest'
import { socialProvidersForRelease } from './socialProviders'

describe('first-release authentication providers', () => {
	test('deployment OAuth credentials cannot reactivate social login', () => {
		expect(
			socialProvidersForRelease({
				GOOGLE_CLIENT_ID: 'google-id',
				GOOGLE_CLIENT_SECRET: 'google-secret',
				APPLE_CLIENT_ID: 'apple-id',
				APPLE_CLIENT_SECRET: 'apple-secret',
			}),
		).toEqual({})
	})
})
