import type { DocumentType } from '@convex/shared/applicationShapes'

// M5-T1 renewal reminders — the pure planning half. Everything here is plain
// date math and copy so it unit-tests under vitest; the expo-notifications
// calls live in reminders.sync.ts and just execute this module's plan. Do not
// import anything from expo here.

/** Days before expiry that a reminder fires (MASTER_PLAN M5-T1). */
export const REMINDER_OFFSETS_DAYS = [180, 90, 30, 7, 1] as const

/** Fixed local hour (24h) reminders fire at — mid-morning, not a wake-up. */
export const REMINDER_HOUR = 9

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Generic, sentence-friendly names for untitled documents. Notification copy
// carries no PII beyond this label (or the person's own document label).
const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
	passport: 'passport',
	ead: 'work permit (EAD)',
	permanentResidentCard: 'green card',
	i94: 'I-94 record',
	socialSecurityCard: 'Social Security card',
	photo: 'photo',
	other: 'document',
}

/** The slice of a Vault document that reminder planning needs. */
export type ReminderDocument = {
	id: string
	type: DocumentType
	label?: string
	expiryDate?: string
	/** Supersession: only the current (non-superseded) version reminds. */
	isCurrent: boolean
}

/** One concrete notification to schedule. */
export type PlannedReminder = {
	documentId: string
	date: Date
	daysBefore: number
	title: string
	body: string
}

/**
 * Parse a strict YYYY-MM-DD into a local-time Date at REMINDER_HOUR, or null
 * for anything malformed — including calendar-impossible dates that would
 * otherwise roll over (2026-02-31 → March 3).
 */
function parseExpiry(expiryDate: string | undefined): Date | null {
	if (expiryDate === undefined || !ISO_DATE_RE.test(expiryDate)) return null
	const [year, month, day] = expiryDate.split('-').map(Number) as [number, number, number]
	const parsed = new Date(year, month - 1, day, REMINDER_HOUR, 0, 0, 0)
	if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
		return null
	}
	return parsed
}

type ReminderSlot = { daysBefore: number; date: Date }

function computeReminderSlots(expiryDate: string | undefined, now: Date): ReminderSlot[] {
	const expiry = parseExpiry(expiryDate)
	if (expiry === null) return []
	return REMINDER_OFFSETS_DAYS.map((daysBefore) => {
		const date = new Date(expiry)
		date.setDate(date.getDate() - daysBefore)
		return { daysBefore, date }
	}).filter((slot) => slot.date.getTime() > now.getTime())
}

/**
 * The 180/90/30/7/1-day-before reminder times for one expiry date, at
 * REMINDER_HOUR local time, filtered to strictly-future times only. An
 * invalid or missing expiry yields [] rather than throwing — one bad row
 * must never break the whole sync.
 */
export function computeReminderTimes(expiryDate: string, now: Date): Date[] {
	return computeReminderSlots(expiryDate, now).map((slot) => slot.date)
}

/** Display label for notification copy: the user's label, else a type name. */
export function reminderDocumentLabel(document: Pick<ReminderDocument, 'type' | 'label'>): string {
	const trimmed = document.label?.trim()
	if (trimmed !== undefined && trimmed !== '') return trimmed
	return DOCUMENT_TYPE_LABELS[document.type] ?? DOCUMENT_TYPE_LABELS.other
}

/** Calm, renewal-focused copy for one reminder. */
export function buildReminderContent(
	document: Pick<ReminderDocument, 'type' | 'label'>,
	daysBefore: number,
): { title: string; body: string } {
	const when = daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`
	return {
		title: `Your ${reminderDocumentLabel(document)} expires ${when}`,
		body: 'A head start makes renewals easier — open Immifile to begin when it suits you.',
	}
}

/**
 * The full reminder plan for a document list: every current document with a
 * valid, future expiry contributes its strictly-future offsets, sorted
 * soonest-first. Superseded versions and expired documents plan nothing.
 */
export function planReminders(
	documents: readonly ReminderDocument[],
	now: Date,
): PlannedReminder[] {
	return documents
		.filter((document) => document.isCurrent)
		.flatMap((document) =>
			computeReminderSlots(document.expiryDate, now).map((slot) => ({
				documentId: document.id,
				date: slot.date,
				daysBefore: slot.daysBefore,
				...buildReminderContent(document, slot.daysBefore),
			})),
		)
		.sort((a, b) => a.date.getTime() - b.date.getTime())
}
