import { describe, expect, test } from 'vitest'
import { i90CardStatuses } from './applicationShapes'
import {
	I765_CATEGORY_NOT_LISTED,
	isI90CardStatus,
	isSupportedI765Category,
	screenI90,
	supportedI765Categories,
} from './screening'

// Deterministic eligibility rules (workflow-repair slice 2). These pin the
// boundary itself: exactly one blocked I-90 combination, and an explicit
// I-765 category list that "notListed" can never satisfy.

describe('screenI90', () => {
	test('a conditional resident renewing an expiring 2-year card is blocked', () => {
		const result = screenI90('conditionalResident', 'renewal')
		expect(result.supported).toBe(false)
		if (!result.supported) {
			expect(result.explanation).toMatch(/I-751/)
			expect(result.officialLinks.some((link) => link.url.includes('uscis.gov'))).toBe(true)
		}
	})

	test('every other status/kind combination is supported', () => {
		for (const cardStatus of i90CardStatuses) {
			for (const applicationKind of ['renewal', 'replacement'] as const) {
				if (cardStatus === 'conditionalResident' && applicationKind === 'renewal') continue
				expect(screenI90(cardStatus, applicationKind).supported).toBe(true)
			}
		}
	})
})

describe('isI90CardStatus', () => {
	test.each([...i90CardStatuses])('accepts %s', (status) => {
		expect(isI90CardStatus(status)).toBe(true)
	})

	test.each(['', 'greenCard', 'notListed', undefined, 42])('rejects %j', (value) => {
		expect(isI90CardStatus(value)).toBe(false)
	})
})

describe('supported I-765 categories', () => {
	test('accepts every supported category and nothing else', () => {
		for (const category of supportedI765Categories) {
			expect(isSupportedI765Category(category)).toBe(true)
		}
		expect(isSupportedI765Category(I765_CATEGORY_NOT_LISTED)).toBe(false)
		expect(isSupportedI765Category('')).toBe(false)
		expect(isSupportedI765Category('C99')).toBe(false)
		expect(isSupportedI765Category(undefined)).toBe(false)
	})
})
