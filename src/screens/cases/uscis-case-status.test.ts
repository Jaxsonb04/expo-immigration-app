// @vitest-environment node

import { describe, expect, test } from 'vitest'

import { copyReceiptAndOpenUscis, USCIS_CASE_STATUS_URL } from './uscis-case-status'

describe('copyReceiptAndOpenUscis', () => {
	test('copies the saved receipt before opening the official USCIS form', async () => {
		const events: string[] = []
		const clipboard = {
			async setStringAsync(receiptNumber: string) {
				expect(this).toBe(clipboard)
				events.push(`copy:${receiptNumber}`)
			},
		}
		const linking = {
			async openURL(url: string) {
				expect(this).toBe(linking)
				events.push(`open:${url}`)
			},
		}

		await copyReceiptAndOpenUscis('EAC1234567890', {
			clipboard,
			linking,
		})

		expect(events).toEqual(['copy:EAC1234567890', `open:${USCIS_CASE_STATUS_URL}`])
	})
})
