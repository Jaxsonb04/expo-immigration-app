import { describe, expect, test } from 'vitest'

import { CLEAN_EXPORT_FREE_FOR_EVERYONE, isEntitledToCleanExport } from './entitlements'

// Product decision (2026-07): the app is free. These pin the seam so the clean
// export cannot be silently re-gated without a deliberate flag flip.

describe('clean-export entitlement seam', () => {
	test('the app is currently free for everyone', () => {
		expect(CLEAN_EXPORT_FREE_FOR_EVERYONE).toBe(true)
	})

	test('an owner with no purchase is entitled to the clean export', () => {
		expect(isEntitledToCleanExport(false)).toBe(true)
	})

	test('a stored active entitlement still counts (seam kept for later monetization)', () => {
		expect(isEntitledToCleanExport(true)).toBe(true)
	})
})
