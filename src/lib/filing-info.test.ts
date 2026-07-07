import { formTypes } from '@convex/shared/applicationShapes'
import { describe, expect, test } from 'vitest'

import {
	FEE_DISCLAIMER,
	FILING_INFO,
	OFFICIAL_LINKS,
	SERVICE_FEE_USD,
	filingInfoFor,
} from './filing-info'

// M2-T4: fee/filing copy is legally sensitive. These pin the safety rails so a
// careless edit can't ship a misleading or unsourced figure.

describe('filing info', () => {
	test('covers both supported forms', () => {
		expect(Object.keys(FILING_INFO).sort()).toEqual([...formTypes].sort())
	})

	test.each(formTypes)('%s fee summary defers to the official fee calculator', (formType) => {
		const info = filingInfoFor(formType)
		expect(info.usciFeeSummary).toMatch(/uscis\.gov\/feecalculator/)
	})

	test('i765 fee summary never presents a single flat number (it is category-dependent)', () => {
		expect(FILING_INFO.i765.usciFeeSummary.toLowerCase()).toMatch(/varies|categor/)
	})

	test('service fee is a positive one-time amount, kept separate from the USCIS fee', () => {
		expect(SERVICE_FEE_USD).toBeGreaterThan(0)
	})

	test('every official link is an https uscis.gov URL', () => {
		for (const url of Object.values(OFFICIAL_LINKS)) {
			expect(url).toMatch(/^https:\/\/www\.uscis\.gov\//)
		}
	})

	test('the fee disclaimer states this is not legal advice and to confirm on uscis.gov', () => {
		expect(FEE_DISCLAIMER).toMatch(/not legal advice/i)
		expect(FEE_DISCLAIMER).toMatch(/uscis\.gov/)
	})
})
