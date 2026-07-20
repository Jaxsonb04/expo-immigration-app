import type { PersonFacts } from '@convex/shared/applicationShapes'
import { degrees, rgb, type PDFDocument, type PDFFont, type PDFForm } from 'pdf-lib'

// Pure fill/flatten/watermark engine for the free draft Preview
// (ADR-0006/0007/0011): no React Native imports, so the whole render path
// unit-tests under vitest's Node environment against the real bundled
// templates. Kept a leaf module — the per-form maps import these helpers,
// and pdf.render.ts dispatches into the maps. The on-device glue lives in
// pdf.preview.ts.

export type FillOp =
	| { kind: 'text'; field: string; value: string }
	| { kind: 'check'; field: string }
	| { kind: 'select'; field: string; value: string }

/** ISO 'YYYY-MM-DD' → the 'MM/DD/YYYY' USCIS date boxes expect; undefined otherwise. */
export function formatUsDate(iso: string | undefined): string | undefined {
	if (iso === undefined) return undefined
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
	if (match === null) return undefined
	return `${match[2]}/${match[3]}/${match[1]}`
}

/**
 * Strip separators and left-pad to 9 digits: the A-Number boxes are 9-digit
 * combs with "A-" preprinted, so an 8-digit A-Number must keep its leading
 * zero rather than drift one cell left.
 */
export function normalizeANumber(raw: string | undefined): string | undefined {
	if (raw === undefined) return undefined
	const digits = raw.replace(/\D/g, '')
	if (digits.length < 7 || digits.length > 9) return undefined
	return digits.padStart(9, '0')
}

/** 'C08' → ['c', '8'] for the letter/number parenthetical boxes; null when unparseable. */
export function splitEligibilityCategory(code: string): [string, string] | null {
	const match = /^([ACac])0*(\d{1,2})$/.exec(code)
	if (match === null) return null
	return [match[1]!.toLowerCase(), match[2]!]
}

export type ParsedUnit = { unitType?: 'apt' | 'ste' | 'flr'; unitNumber: string }

/**
 * Free-text unit ('APT 4B', 'Suite 200', '#12', '4B') → the form's
 * type-checkbox family plus number box. A '#' or 'Unit' prefix is stripped
 * but maps to no type checkbox.
 */
export function parseUnit(raw: string): ParsedUnit {
	const trimmed = raw.trim()
	const typed = /^(apt|apartment|ste|suite|flr|floor)\b\.?\s*#?\s*(.+)$/i.exec(trimmed)
	if (typed !== null) {
		const prefix = typed[1]!.toLowerCase()
		const unitType = prefix.startsWith('a') ? 'apt' : prefix.startsWith('s') ? 'ste' : 'flr'
		return { unitType, unitNumber: typed[2]!.trim() }
	}
	const bare = /^(?:#|unit\b\.?)\s*(.+)$/i.exec(trimmed)
	if (bare !== null) return { unitNumber: bare[1]!.trim() }
	return { unitNumber: trimmed }
}

/** Push a text op unless the value is missing or blank. */
export function pushTextOp(ops: FillOp[], field: string, value: string | undefined): void {
	const trimmed = value?.trim() ?? ''
	if (trimmed !== '') ops.push({ kind: 'text', field, value: trimmed })
}

export type AddressFieldPaths = {
	street: string
	unitNumber: string
	unitType: Record<NonNullable<ParsedUnit['unitType']>, string>
	city: string
	state: string
	zip: string
}

/** Shared mailing-address block: both forms split one address across the same op shapes. */
export function pushAddressOps(
	ops: FillOp[],
	address: PersonFacts['mailingAddress'] | undefined,
	fields: AddressFieldPaths,
): void {
	if (address === undefined) return
	pushTextOp(ops, fields.street, address.street)
	if (address.unit !== undefined && address.unit.trim() !== '') {
		const { unitType, unitNumber } = parseUnit(address.unit)
		if (unitType !== undefined) ops.push({ kind: 'check', field: fields.unitType[unitType] })
		pushTextOp(ops, fields.unitNumber, unitNumber)
	}
	pushTextOp(ops, fields.city, address.city)
	const state = address.state.trim()
	// The state boxes are PDFDropdowns whose options are 2-letter codes.
	if (state !== '') ops.push({ kind: 'select', field: fields.state, value: state.toUpperCase() })
	pushTextOp(ops, fields.zip, address.zipCode)
}

export type ApplyOpsResult = { filledCount: number; failedFields: string[] }

/**
 * Apply every op in its own try/catch: a USCIS edition that renames or drops
 * one field must never abort the render mid-way. Every op that does not land
 * is reported in `failedFields` — the caller decides whether that is
 * survivable (watermarked draft preview) or fatal (a clean filing package
 * must fail closed rather than ship with an answer silently missing).
 */
export function applyOps(form: PDFForm, ops: FillOp[]): ApplyOpsResult {
	let filledCount = 0
	const failedFields: string[] = []
	for (const op of ops) {
		try {
			if (op.kind === 'text') {
				if (op.value === '') continue
				const field = form.getTextField(op.field)
				const maxLength = field.getMaxLength()
				const value =
					maxLength !== undefined && op.value.length > maxLength
						? op.value.slice(0, maxLength)
						: op.value
				field.setText(value)
			} else if (op.kind === 'check') {
				form.getCheckBox(op.field).check()
			} else {
				form.getDropdown(op.field).select(op.value)
			}
			filledCount += 1
		} catch {
			failedFields.push(op.field)
		}
	}
	return { filledCount, failedFields }
}

const WATERMARK_TEXT = 'DRAFT — NOT FOR FILING'
const WATERMARK_SIZE = 26

/** Stamp the diagonal, semi-transparent draft notice across every page. */
export function drawDraftWatermark(doc: PDFDocument, boldFont: PDFFont): void {
	const half = boldFont.widthOfTextAtSize(WATERMARK_TEXT, WATERMARK_SIZE) / 2
	for (const page of doc.getPages()) {
		const { width, height } = page.getSize()
		page.drawText(WATERMARK_TEXT, {
			// Offset the start point so the 45-degree run of text is centered.
			x: width / 2 - half * Math.cos(Math.PI / 4),
			y: height / 2 - half * Math.sin(Math.PI / 4),
			size: WATERMARK_SIZE,
			font: boldFont,
			color: rgb(0.8, 0.12, 0.12),
			rotate: degrees(45),
			opacity: 0.3,
		})
	}
}
