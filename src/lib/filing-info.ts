import type { FormType } from '@convex/shared/applicationShapes'

// M2-T4 filing-fee + filing-instruction display data. Sourced from the USCIS
// G-1055 Fee Schedule (Edition 05/29/26) and the official form pages, then
// adversarially verified against uscis.gov. IMPORTANT: fees are legally
// sensitive and change (the Pub. L. 119-21 EAD fees were inflation-adjusted on
// 2026-01-01; the next adjustment is expected ~2027-01). We therefore always
// show a best-known figure WITH an "as of" date AND a live link to the official
// fee calculator so a stale build is obvious and users can confirm. This is fee
// information, not legal advice.

/** When these figures were last checked against uscis.gov. Surface it so a
 * stale build is visible. */
export const FILING_FEE_AS_OF = 'G-1055 Edition 05/29/26, verified 2026-07-06'

export const OFFICIAL_LINKS = {
	feeCalculator: 'https://www.uscis.gov/feecalculator',
	feeWaiver: 'https://www.uscis.gov/i-912',
	i765Addresses: 'https://www.uscis.gov/i-765-addresses',
	i765: 'https://www.uscis.gov/i-765',
	i90: 'https://www.uscis.gov/i-90',
} as const

type FormFilingInfo = {
	/** Concise, verified USCIS filing-fee summary (paid to USCIS, not the app). */
	usciFeeSummary: string
	/** Where/how to file, verified against the official form page. */
	filingInstructions: string
	/** The most relevant official link for this form's filing address. */
	addressLink: string
}

export const FILING_INFO: Record<FormType, FormFilingInfo> = {
	i765: {
		usciFeeSummary:
			'Varies by your eligibility category. Standard: about $470 online / $520 paper. Many humanitarian and adjustment categories are $0, and some asylum/parole/TPS categories owe an extra non-waivable fee. Biometrics are included — no separate fee. Confirm YOUR exact fee at uscis.gov/feecalculator.',
		filingInstructions:
			'Where you file depends on your eligibility category and whether you file the I-765 alone or with another form (filing with Form I-485 or I-539 goes to that form’s location). Many categories can file online. Look up your exact filing address at uscis.gov/i-765-addresses.',
		addressLink: OFFICIAL_LINKS.i765Addresses,
	},
	i90: {
		usciFeeSummary:
			'About $415 online / $465 paper. Biometrics are included — no separate fee. Some cases are free ($0), such as replacing a card USCIS issued with an error, or a card that was mailed but returned undelivered. Confirm the current fee at uscis.gov/feecalculator.',
		filingInstructions:
			'File online through a USCIS online account, or mail it. By USPS: USCIS, Attn: I-90, P.O. Box 21262, Phoenix, AZ 85036-1262 (confirm the current address at uscis.gov/i-90). You cannot file online if you are requesting a fee waiver — file on paper instead.',
		addressLink: OFFICIAL_LINKS.i90,
	},
}

/** Shown next to any USCIS fee figure. */
export const FEE_DISCLAIMER =
	'USCIS fees can change (last adjusted Jan 1, 2026). Confirm the current fee for your situation at uscis.gov/feecalculator before filing. This is fee information, not legal advice.'

/** Universal steps that apply to both forms, printed on the package cover. */
export const COMMON_FILING_STEPS = [
	'Print all pages single-sided.',
	'Sign and date the form — an unsigned form is rejected.',
	'Include the correct USCIS filing fee for your category (or a fee-waiver request, Form I-912, if eligible).',
	'Confirm your mailing address and the current fee on uscis.gov, or file online.',
	'Attach the supporting documents from your Documents checklist.',
] as const

export function filingInfoFor(formType: FormType): FormFilingInfo {
	return FILING_INFO[formType]
}
