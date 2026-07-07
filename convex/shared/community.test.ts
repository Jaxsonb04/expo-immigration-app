import { describe, expect, test } from 'vitest'
import {
	COMMENT_BODY_MAX,
	DEFAULT_PAGE_SIZE,
	HANDLE_MAX,
	MAX_PAGE_SIZE,
	POST_TITLE_MAX,
	clampPageSize,
	generateHandle,
	isValidHandle,
	optionalText,
	requireText,
	targetKeyFor,
} from './community'

describe('clampPageSize', () => {
	test('defaults when undefined or non-finite', () => {
		expect(clampPageSize(undefined)).toBe(DEFAULT_PAGE_SIZE)
		expect(clampPageSize(Number.NaN)).toBe(DEFAULT_PAGE_SIZE)
		expect(clampPageSize(Number.POSITIVE_INFINITY)).toBe(DEFAULT_PAGE_SIZE)
	})
	test('caps an over-large request at MAX_PAGE_SIZE', () => {
		expect(clampPageSize(100_000)).toBe(MAX_PAGE_SIZE)
		expect(clampPageSize(51)).toBe(MAX_PAGE_SIZE)
	})
	test('floors a too-small request at 1 and floors fractions', () => {
		expect(clampPageSize(0)).toBe(1)
		expect(clampPageSize(-5)).toBe(1)
		expect(clampPageSize(3.9)).toBe(3)
	})
	test('passes a reasonable value through', () => {
		expect(clampPageSize(25)).toBe(25)
	})
})

describe('isValidHandle', () => {
	test.each(['abc', 'Quiet_Sparrow', 'A1_b2', 'x'.repeat(HANDLE_MAX)])('accepts %s', (h) => {
		expect(isValidHandle(h)).toBe(true)
	})
	test.each(['ab', '', 'x'.repeat(HANDLE_MAX + 1), 'has space', 'emoji😀', 'dash-no', 'dot.no'])(
		'rejects %s',
		(h) => {
			expect(isValidHandle(h)).toBe(false)
		},
	)
})

describe('generateHandle', () => {
	test('always produces a valid handle across many seeds/salts', () => {
		for (let seed = 0; seed < 200; seed++) {
			for (let salt = 0; salt < 8; salt++) {
				expect(isValidHandle(generateHandle(seed, salt))).toBe(true)
			}
		}
	})
	test('varying salt changes the handle so retries can escape a collision', () => {
		expect(generateHandle(12345, 0)).not.toBe(generateHandle(12345, 1))
	})
})

describe('requireText', () => {
	test('trims and returns', () => {
		expect(requireText('  hello  ', POST_TITLE_MAX, 'Title')).toBe('hello')
	})
	test('rejects empty and whitespace-only', () => {
		expect(() => requireText('', POST_TITLE_MAX, 'Title')).toThrow(/required/i)
		expect(() => requireText('   ', POST_TITLE_MAX, 'Title')).toThrow(/required/i)
	})
	test('rejects over-long (measured after trim)', () => {
		expect(() => requireText('x'.repeat(POST_TITLE_MAX + 1), POST_TITLE_MAX, 'Title')).toThrow(/fewer/i)
		// Trailing whitespace does not count toward the limit.
		expect(requireText(`${'x'.repeat(POST_TITLE_MAX)}   `, POST_TITLE_MAX, 'Title')).toHaveLength(
			POST_TITLE_MAX,
		)
	})
})

describe('optionalText', () => {
	test('undefined stays undefined; empty/whitespace collapses to undefined', () => {
		expect(optionalText(undefined, COMMENT_BODY_MAX, 'Note')).toBeUndefined()
		expect(optionalText('   ', COMMENT_BODY_MAX, 'Note')).toBeUndefined()
	})
	test('trims a present value and enforces max', () => {
		expect(optionalText('  hi ', COMMENT_BODY_MAX, 'Note')).toBe('hi')
		expect(() => optionalText('x'.repeat(COMMENT_BODY_MAX + 1), COMMENT_BODY_MAX, 'Note')).toThrow(
			/fewer/i,
		)
	})
})

describe('targetKeyFor', () => {
	test('namespaces post vs comment ids', () => {
		expect(targetKeyFor('post', 'abc')).toBe('p:abc')
		expect(targetKeyFor('comment', 'abc')).toBe('c:abc')
		expect(targetKeyFor('post', 'abc')).not.toBe(targetKeyFor('comment', 'abc'))
	})
})
