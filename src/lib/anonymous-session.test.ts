// @vitest-environment node

import { describe, expect, test, vi } from 'vitest'

import { establishAnonymousSession } from './anonymous-session'

describe('establishAnonymousSession', () => {
	test('reuses a valid persisted session even when the in-memory cache is empty', async () => {
		const signInAnonymously = vi.fn()
		const resolveSession = vi.fn().mockResolvedValue(true)

		const result = await establishAnonymousSession({
			hasPersistedCookie: () => true,
			resolveSession,
			signInAnonymously,
		})

		expect(result).toEqual({ ok: true, createdUserId: null })
		expect(resolveSession).toHaveBeenCalledWith()
		expect(signInAnonymously).not.toHaveBeenCalled()
	})

	test('reuses a valid session on retry without creating another anonymous identity', async () => {
		const signInAnonymously = vi.fn()
		const resolveSession = vi.fn().mockResolvedValue(true)

		const result = await establishAnonymousSession({
			hasPersistedCookie: () => true,
			resolveSession,
			signInAnonymously,
		})

		expect(result).toEqual({ ok: true, createdUserId: null })
		expect(resolveSession).toHaveBeenCalledWith()
		expect(signInAnonymously).not.toHaveBeenCalled()
	})

	test('never accepts another cached user after anonymous sign-in created a specific identity', async () => {
		const resolveSession = vi
			.fn<(expectedUserId?: string) => Promise<boolean>>()
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true)

		const result = await establishAnonymousSession({
			hasPersistedCookie: () => false,
			resolveSession,
			signInAnonymously: vi.fn().mockResolvedValue({
				data: { user: { id: 'fresh-user' } },
				error: null,
			}),
		})

		expect(result).toEqual({ ok: false, message: 'Please try again in a moment.' })
		expect(resolveSession).toHaveBeenCalledTimes(1)
		expect(resolveSession).toHaveBeenCalledWith('fresh-user')
	})

	test('resolves the exact user returned by a fresh anonymous sign-in', async () => {
		const signInAnonymously = vi.fn().mockResolvedValue({
			data: { user: { id: 'fresh-user' } },
			error: null,
		})
		const resolveSession = vi.fn().mockResolvedValue(true)

		const result = await establishAnonymousSession({
			hasPersistedCookie: () => false,
			resolveSession,
			signInAnonymously,
		})

		expect(result).toEqual({ ok: true, createdUserId: 'fresh-user' })
		expect(signInAnonymously).toHaveBeenCalledOnce()
		expect(resolveSession).toHaveBeenCalledWith('fresh-user')
	})

	test('recovers a session that landed even when the sign-in call reported an error', async () => {
		const signInAnonymously = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'Request interrupted' },
		})
		const resolveSession = vi.fn().mockResolvedValue(true)

		const result = await establishAnonymousSession({
			hasPersistedCookie: () => false,
			resolveSession,
			signInAnonymously,
		})

		expect(result).toEqual({ ok: true, createdUserId: null })
		expect(signInAnonymously).toHaveBeenCalledOnce()
		expect(resolveSession).toHaveBeenCalledOnce()
	})

	test('returns the server error when neither sign-in nor reconciliation succeeds', async () => {
		const result = await establishAnonymousSession({
			hasPersistedCookie: () => false,
			resolveSession: vi.fn().mockResolvedValue(false),
			signInAnonymously: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Network unavailable' },
			}),
		})

		expect(result).toEqual({ ok: false, message: 'Network unavailable' })
	})
})
