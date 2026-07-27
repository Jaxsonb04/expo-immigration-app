import { describe, expect, test } from 'vitest'
import { CASE_NOTE_MAX, normalizeCaseNote } from './cases'

describe('case note boundary', () => {
	test('trims notes and collapses empty notes', () => {
		expect(normalizeCaseNote('  appointment scheduled  ')).toBe('appointment scheduled')
		expect(normalizeCaseNote('   ')).toBeUndefined()
		expect(normalizeCaseNote(undefined)).toBeUndefined()
	})

	test('rejects oversized notes', () => {
		expect(() => normalizeCaseNote('x'.repeat(CASE_NOTE_MAX + 1))).toThrow(
			`${CASE_NOTE_MAX} characters or fewer`,
		)
	})
})
