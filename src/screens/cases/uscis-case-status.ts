export const USCIS_CASE_STATUS_URL = 'https://egov.uscis.gov/'

type UscisCaseStatusDependencies = {
	clipboard: {
		setStringAsync: (receiptNumber: string) => Promise<unknown>
	}
	linking: {
		openURL: (url: string) => Promise<unknown>
	}
}

/**
 * Handles the user-approved handoff to USCIS without placing a receipt number
 * in browser history or relying on an unsupported USCIS deep link.
 */
export async function copyReceiptAndOpenUscis(
	receiptNumber: string,
	{ clipboard, linking }: UscisCaseStatusDependencies,
): Promise<void> {
	await clipboard.setStringAsync(receiptNumber)
	await linking.openURL(USCIS_CASE_STATUS_URL)
}
