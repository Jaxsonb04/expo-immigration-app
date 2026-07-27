// @vitest-environment node

import { afterEach, describe, expect, test, vi } from 'vitest'

import { waitForAuthenticatedOrUnmounted } from './auth-transition'

describe('waitForAuthenticatedOrUnmounted', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	test('keeps waiting until Convex confirms authentication', async () => {
		vi.useFakeTimers()
		let authenticated = false

		const result = waitForAuthenticatedOrUnmounted({
			isAuthenticated: () => authenticated,
			isMounted: () => true,
			timeoutMs: 1_000,
			pollIntervalMs: 50,
		})

		await vi.advanceTimersByTimeAsync(200)
		authenticated = true
		await vi.advanceTimersByTimeAsync(50)

		await expect(result).resolves.toBe(true)
	})

	test('returns false after the bounded window when the route is still stranded', async () => {
		vi.useFakeTimers()

		const result = waitForAuthenticatedOrUnmounted({
			isAuthenticated: () => false,
			isMounted: () => true,
			timeoutMs: 200,
			pollIntervalMs: 50,
		})

		await vi.advanceTimersByTimeAsync(250)
		await expect(result).resolves.toBe(false)
	})

	test('treats the Welcome route unmounting as a successful transition', async () => {
		vi.useFakeTimers()
		let mounted = true

		const result = waitForAuthenticatedOrUnmounted({
			isAuthenticated: () => false,
			isMounted: () => mounted,
			timeoutMs: 1_000,
			pollIntervalMs: 50,
		})

		mounted = false
		await vi.advanceTimersByTimeAsync(50)
		await expect(result).resolves.toBe(true)
	})
})
