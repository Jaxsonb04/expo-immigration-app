import { describe, expect, test } from 'vitest'
import { resolveTabIntroVisibility } from './tab-intro-state'

describe('resolveTabIntroVisibility', () => {
	test('keeps the tab content visible while the preference is loading', () => {
		expect(
			resolveTabIntroVisibility({
				dismissed: undefined,
				dismissing: false,
				acknowledged: false,
			}),
		).toEqual({ showIntro: false, showContent: true })
	})

	test('still replaces the content with the intro for a first-time user', () => {
		expect(
			resolveTabIntroVisibility({
				dismissed: false,
				dismissing: false,
				acknowledged: false,
			}),
		).toEqual({ showIntro: true, showContent: false })
	})
})
