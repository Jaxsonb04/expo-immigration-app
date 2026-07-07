import { documentTypes } from '@convex/shared/applicationShapes'
import { describe, expect, test } from 'vitest'
import {
	REMINDER_HOUR,
	REMINDER_OFFSETS_DAYS,
	buildReminderContent,
	computeReminderTimes,
	planReminders,
	reminderDocumentLabel,
	type ReminderDocument,
} from './reminders'

// Fixed "now": Jan 2 2026, noon local time. All expectations are computed in
// local time too, so the suite is timezone-independent.
const NOW = new Date(2026, 0, 2, 12, 0, 0)

function daysBeforeLocal(expiry: Date, days: number): number {
	const date = new Date(expiry)
	date.setDate(date.getDate() - days)
	return date.getTime()
}

describe('computeReminderTimes', () => {
	test('returns all five offsets for a far-future expiry, soonest last', () => {
		const times = computeReminderTimes('2027-06-15', NOW)
		expect(times).toHaveLength(REMINDER_OFFSETS_DAYS.length)
		const expiry = new Date(2027, 5, 15, REMINDER_HOUR, 0, 0)
		expect(times.map((t) => t.getTime())).toEqual(
			REMINDER_OFFSETS_DAYS.map((days) => daysBeforeLocal(expiry, days)),
		)
	})

	test('fires at the fixed local hour, deterministically', () => {
		const first = computeReminderTimes('2027-06-15', NOW)
		const second = computeReminderTimes('2027-06-15', NOW)
		expect(first.map((t) => t.getTime())).toEqual(second.map((t) => t.getTime()))
		for (const time of first) {
			expect(time.getHours()).toBe(REMINDER_HOUR)
			expect(time.getMinutes()).toBe(0)
			expect(time.getSeconds()).toBe(0)
		}
	})

	test('near expiry yields only the strictly-future subset', () => {
		// Expiry 40 days after NOW: the 180- and 90-day marks are already past,
		// leaving 30/7/1.
		const times = computeReminderTimes('2026-02-11', NOW)
		expect(times).toHaveLength(3)
		for (const time of times) {
			expect(time.getTime()).toBeGreaterThan(NOW.getTime())
		}
	})

	test('a reminder landing exactly at now is excluded (strictly future)', () => {
		// 30 days before 2026-02-01 is Jan 2 at REMINDER_HOUR — exactly `at`.
		const at = new Date(2026, 0, 2, REMINDER_HOUR, 0, 0)
		const times = computeReminderTimes('2026-02-01', at)
		expect(times).toHaveLength(2) // only the 7- and 1-day marks remain
	})

	test('past expiry yields []', () => {
		expect(computeReminderTimes('2025-06-15', NOW)).toEqual([])
	})

	test('expiry today yields []', () => {
		expect(computeReminderTimes('2026-01-02', NOW)).toEqual([])
	})

	test('invalid or malformed expiry yields []', () => {
		expect(computeReminderTimes('', NOW)).toEqual([])
		expect(computeReminderTimes('not-a-date', NOW)).toEqual([])
		expect(computeReminderTimes('2026-2-1', NOW)).toEqual([])
		expect(computeReminderTimes('06/15/2027', NOW)).toEqual([])
		// Calendar-impossible date must not roll over into March.
		expect(computeReminderTimes('2026-02-31', NOW)).toEqual([])
	})
})

describe('buildReminderContent', () => {
	test('titles a typed document with a day count', () => {
		expect(buildReminderContent({ type: 'ead' }, 30).title).toBe(
			'Your work permit (EAD) expires in 30 days',
		)
	})

	test('says tomorrow for the 1-day reminder', () => {
		expect(buildReminderContent({ type: 'passport' }, 1).title).toBe(
			'Your passport expires tomorrow',
		)
	})

	test('prefers the user label over the type name', () => {
		expect(buildReminderContent({ type: 'other', label: 'Advance parole' }, 7).title).toBe(
			'Your Advance parole expires in 7 days',
		)
	})

	test('body nudges opening Immifile, calmly', () => {
		const { body } = buildReminderContent({ type: 'ead' }, 90)
		expect(body).toContain('Immifile')
		expect(body).not.toMatch(/urgent|immediately|warning|!/i)
	})
})

describe('reminderDocumentLabel', () => {
	test('covers every backend document type', () => {
		for (const type of documentTypes) {
			expect(reminderDocumentLabel({ type }).length).toBeGreaterThan(0)
		}
	})

	test('ignores whitespace-only labels', () => {
		expect(reminderDocumentLabel({ type: 'passport', label: '   ' })).toBe('passport')
	})
})

describe('planReminders', () => {
	const doc = (overrides: Partial<ReminderDocument>): ReminderDocument => ({
		id: 'doc',
		type: 'ead',
		isCurrent: true,
		...overrides,
	})

	test('plans only current documents with a valid future expiry', () => {
		const plan = planReminders(
			[
				doc({ id: 'current', expiryDate: '2027-06-15' }),
				doc({ id: 'superseded', expiryDate: '2027-06-15', isCurrent: false }),
				doc({ id: 'no-expiry' }),
				doc({ id: 'expired', expiryDate: '2020-01-01' }),
				doc({ id: 'garbage', expiryDate: 'soon' }),
			],
			NOW,
		)
		expect(plan).toHaveLength(REMINDER_OFFSETS_DAYS.length)
		expect(new Set(plan.map((r) => r.documentId))).toEqual(new Set(['current']))
	})

	test('sorts soonest-first across documents and carries content', () => {
		const plan = planReminders(
			[
				doc({ id: 'later', expiryDate: '2027-06-15' }),
				doc({ id: 'sooner', type: 'passport', expiryDate: '2026-02-11' }),
			],
			NOW,
		)
		const times = plan.map((r) => r.date.getTime())
		expect(times).toEqual([...times].sort((a, b) => a - b))
		expect(plan[0]?.documentId).toBe('sooner')
		expect(plan[0]?.daysBefore).toBe(30)
		expect(plan[0]?.title).toBe('Your passport expires in 30 days')
	})
})
