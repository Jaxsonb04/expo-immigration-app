import { describe, expect, test } from 'vitest'
import {
	REPORT_REASON_LABELS,
	commentCountLabel,
	formatRelativeTime,
	handleInitials,
} from './community.format'

const NOW = 1_700_000_000_000

describe('formatRelativeTime', () => {
	test('buckets recent times', () => {
		expect(formatRelativeTime(NOW, NOW)).toBe('just now')
		expect(formatRelativeTime(NOW - 30_000, NOW)).toBe('just now')
		expect(formatRelativeTime(NOW - 5 * 60_000, NOW)).toBe('5m ago')
		expect(formatRelativeTime(NOW - 3 * 3_600_000, NOW)).toBe('3h ago')
		expect(formatRelativeTime(NOW - 2 * 86_400_000, NOW)).toBe('2d ago')
	})
	test('falls back to an absolute date beyond a week', () => {
		const result = formatRelativeTime(NOW - 30 * 86_400_000, NOW)
		expect(result).not.toMatch(/ago|just now/)
	})
	test('never shows a negative/future delta', () => {
		expect(formatRelativeTime(NOW + 10_000, NOW)).toBe('just now')
	})
})

describe('handleInitials', () => {
	test('uses uppercase humps when present', () => {
		expect(handleInitials('QuietSparrow492')).toBe('QS')
	})
	test('falls back to the first two characters', () => {
		expect(handleInitials('alice_cool')).toBe('AL')
		expect(handleInitials('Bob')).toBe('BO')
	})
	test('handles empty input', () => {
		expect(handleInitials('   ')).toBe('?')
	})
})

describe('commentCountLabel', () => {
	test('pluralizes correctly', () => {
		expect(commentCountLabel(0)).toBe('No comments yet')
		expect(commentCountLabel(1)).toBe('1 comment')
		expect(commentCountLabel(5)).toBe('5 comments')
	})
})

describe('REPORT_REASON_LABELS', () => {
	test('covers every backend reason', () => {
		expect(Object.keys(REPORT_REASON_LABELS).sort()).toEqual(
			['harassment', 'legalAdvice', 'misinformation', 'other', 'spam'].sort(),
		)
	})
})
