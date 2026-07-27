import type { DocumentType } from './applicationShapes'

/**
 * Version of the user-review checklist stored on each confirmed requirement.
 * A future legal/checklist change intentionally invalidates draft confirmations
 * made against an older version; filing records retain their captured version
 * and exact answer-aware requirement-key snapshot.
 */
export const EVIDENCE_CONTRACT_VERSION = 'uscis-evidence-2026-07-25'

export type EvidenceRequirement = {
	label: string
	fulfillment: 'document' | 'physical'
	acceptedDocumentTypes: readonly DocumentType[]
	guidance: string
	confirmationItems: readonly string[]
}

const documentReview = [
	'This is the correct evidence for this person and requirement.',
	'Every required page or side is included and readable.',
	'Any foreign-language material includes a full English translation and signed translator certification.',
] as const

/**
 * Current evidence checklist for the situations the app presents. This is the
 * single source for labels, accepted Vault types, and the confirmation copy
 * shown before a requirement can satisfy server-owned readiness.
 *
 * Sources revalidated 2026-07-25: USCIS I-765 Instructions 08/21/25 and I-90
 * Instructions 01/20/25. The catalog deliberately describes evidence; it does
 * not claim that Immifile can inspect or legally approve an uploaded file.
 */
export const evidenceRequirements: Record<string, EvidenceRequirement> = {
	eadCard: {
		label: 'Last EAD, front and back',
		fulfillment: 'document',
		acceptedDocumentTypes: ['ead'],
		guidance:
			'Include a readable copy of the front and back of your previous Employment Authorization Document.',
		confirmationItems: documentReview,
	},
	passportPhoto: {
		label: 'Two identical printed passport-style photos',
		fulfillment: 'physical',
		acceptedDocumentTypes: [],
		guidance:
			'For a paper Form I-765 filing, prepare two identical recent color photos that meet the USCIS 2-by-2-inch specifications. This checklist item does not ask you to upload a substitute image.',
		confirmationItems: [
			'I have two identical recent color photos, each printed 2 by 2 inches.',
			'The photos have the required light background, full frontal view, and are unmounted and unretouched.',
			'I will lightly write my name and A-Number, if any, on the back of both photos.',
		],
	},
	entryDocument: {
		label: 'Entry document: I-94, passport, or other travel document',
		fulfillment: 'document',
		acceptedDocumentTypes: ['i94', 'passport', 'other'],
		guidance:
			'Use at least one accepted alternative: both sides of a paper I-94 or the electronic printout, a passport, or another travel document. Form I-94 itself is not mandatory when none was issued.',
		confirmationItems: documentReview,
	},
	identityEvidence: {
		label: 'Last EAD or government-issued identity evidence',
		fulfillment: 'document',
		acceptedDocumentTypes: ['ead', 'passport', 'other'],
		guidance:
			'Use your last EAD when applicable. Otherwise use qualifying government-issued identity evidence showing your photograph and biographic information.',
		confirmationItems: documentReview,
	},
	otherNamesEvidence: {
		label: 'Evidence for every other name used',
		fulfillment: 'document',
		acceptedDocumentTypes: ['passport', 'other'],
		guidance:
			'Include evidence connecting every other name you listed, such as a birth certificate, marriage certificate, divorce record, government ID, or passport identity page.',
		confirmationItems: documentReview,
	},
	refugeeStatusEvidence: {
		label: 'Evidence of refugee status',
		fulfillment: 'document',
		acceptedDocumentTypes: ['i94', 'other'],
		guidance:
			'Use an accepted refugee-status record, such as a stamped I-94, Final Notice of Eligibility for Resettlement, or qualifying I-730 approval notice.',
		confirmationItems: documentReview,
	},
	asyleeStatusEvidence: {
		label: 'Evidence that asylum was granted',
		fulfillment: 'document',
		acceptedDocumentTypes: ['i94', 'other'],
		guidance:
			'Use an accepted asylum-status record, such as a stamped I-94, USCIS asylum approval letter, immigration-judge order, or qualifying I-730 approval notice.',
		confirmationItems: documentReview,
	},
	pendingAsylumEvidence: {
		label: 'Evidence that Form I-589 remains pending',
		fulfillment: 'document',
		acceptedDocumentTypes: ['other'],
		guidance:
			'The correct proof depends on whether the asylum case is with USCIS, EOIR, the BIA, or a federal court. Include the receipt, notices, orders, and pending-case proof that match your complete procedural history.',
		confirmationItems: [
			...documentReview,
			'The evidence matches where my asylum case is pending and includes every applicable notice, appeal, or remand document.',
		],
	},
	courtDispositions: {
		label: 'Certified records for every arrest or conviction',
		fulfillment: 'document',
		acceptedDocumentTypes: ['other'],
		guidance:
			'For a category (c)(8) initial or renewal filing that answers Yes, include certified arrest reports, court dispositions, sentencing records, and every other applicable record.',
		confirmationItems: [
			...documentReview,
			'The file covers every arrest and conviction, including sealed, expunged, or otherwise cleared records.',
		],
	},
	pendingI485Evidence: {
		label: 'Evidence that Form I-485 is pending',
		fulfillment: 'document',
		acceptedDocumentTypes: ['other'],
		guidance:
			'If filing separately from Form I-485, include its receipt notice or other proof it remains pending. An EOIR filing also needs the applicable proceedings and court-filing proof.',
		confirmationItems: [
			...documentReview,
			'If this is a National Interest Waiver physician renewal, I included the required progress evidence or explanation.',
		],
	},
	cancellationProceedingsEvidence: {
		label: 'Applicable suspension or cancellation proceeding evidence',
		fulfillment: 'document',
		acceptedDocumentTypes: ['other'],
		guidance:
			'Include the records for your actual NACARA or non-NACARA path. A non-NACARA filing generally needs proof of current proceedings, fee payment or waiver, and a properly filed EOIR-40 or EOIR-42B.',
		confirmationItems: [
			...documentReview,
			'The evidence matches my NACARA or non-NACARA path and includes every filing, proceeding, and fee record USCIS lists for that path.',
		],
	},
	formI821D: {
		label: 'Current Form I-821D prepared for this DACA request',
		fulfillment: 'physical',
		acceptedDocumentTypes: [],
		guidance:
			'Initial and renewal category (c)(33) requests must include the current Form I-821D. Immifile does not prepare that companion form.',
		confirmationItems: [
			'I completed and reviewed the current Form I-821D for the same person and request.',
			'I will include every required I-821D page, signature, and supporting item.',
		],
	},
	formI765WS: {
		label: 'Current Form I-765WS prepared',
		fulfillment: 'physical',
		acceptedDocumentTypes: [],
		guidance:
			'Category (c)(33) initial and renewal requests use Form I-765WS to show economic need. Immifile does not prepare that companion worksheet.',
		confirmationItems: [
			'I completed and reviewed the current Form I-765WS.',
			'I will include the signed worksheet with this request.',
		],
	},
	currentDacaEvidence: {
		label: 'Evidence of current DACA for a replacement EAD',
		fulfillment: 'document',
		acceptedDocumentTypes: ['other'],
		guidance:
			'For replacement of a currently valid DACA EAD, include evidence of current DACA, such as the latest approval notice.',
		confirmationItems: documentReview,
	},
	originalIncorrectEad: {
		label: 'Original incorrect EAD ready to mail',
		fulfillment: 'physical',
		acceptedDocumentTypes: [],
		guidance:
			'This replacement path is only for incorrect data not caused by USCIS. Prepare the original incorrect EAD and proof of the correct information. If USCIS caused the error, use USCIS card-error instructions instead of filing a new I-765.',
		confirmationItems: [
			'The incorrect data was not caused by USCIS.',
			'I have the original incorrect EAD and will include it as the current USCIS instructions require.',
		],
	},
	applicantEStatusEvidence: {
		label: "Evidence of the applicant's lawful E status",
		fulfillment: 'document',
		acceptedDocumentTypes: ['i94', 'passport', 'other'],
		guidance:
			'Include evidence of the applicant spouse’s lawful E nonimmigrant status, such as the applicable I-94, passport, travel document, or approval notice.',
		confirmationItems: documentReview,
	},
	spouseEStatusEvidence: {
		label: "Evidence of the principal spouse's lawful E status",
		fulfillment: 'document',
		acceptedDocumentTypes: ['i94', 'passport', 'other'],
		guidance: 'Include evidence of the principal spouse’s qualifying lawful E nonimmigrant status.',
		confirmationItems: documentReview,
	},
	marriageCertificate: {
		label: 'Marriage certificate',
		fulfillment: 'document',
		acceptedDocumentTypes: ['other'],
		guidance: 'Include evidence of the legal marital relationship to the principal spouse.',
		confirmationItems: documentReview,
	},
	h4StatusEvidence: {
		label: 'Evidence of current H-4 status',
		fulfillment: 'document',
		acceptedDocumentTypes: ['i94', 'other'],
		guidance:
			'Include the current I-539 approval notice, I-94 showing H-4 admission, or applicable extension-of-stay evidence.',
		confirmationItems: documentReview,
	},
	h1bSpouseEligibilityEvidence: {
		label: "Evidence of the H-1B spouse's qualifying basis",
		fulfillment: 'document',
		acceptedDocumentTypes: ['passport', 'other'],
		guidance:
			'Include evidence of the principal spouse’s valid H-1B status and either an approved I-140 or the complete qualifying AC21 extension basis.',
		confirmationItems: [
			...documentReview,
			'The evidence establishes the approved-I-140 or AC21 basis that actually applies to my spouse.',
		],
	},
	permanentResidentCard: {
		label: 'Expired or expiring Permanent Resident Card, front and back',
		fulfillment: 'document',
		acceptedDocumentTypes: ['permanentResidentCard'],
		guidance:
			'For I-90 renewal reason 2.f, include a readable copy of the front and back of the card that is expired or will expire within six months.',
		confirmationItems: documentReview,
	},
	permanentResidentCardOrGovernmentId: {
		label: 'Green Card copy or qualifying government-issued ID',
		fulfillment: 'document',
		acceptedDocumentTypes: ['permanentResidentCard', 'passport', 'other'],
		guidance:
			'Use a copy of the card if available, or a government-issued ID containing your name, date of birth, photograph, and signature.',
		confirmationItems: documentReview,
	},
	originalIncorrectPermanentResidentCard: {
		label: 'Original incorrect Permanent Resident Card ready to mail',
		fulfillment: 'physical',
		acceptedDocumentTypes: [],
		guidance:
			'For an error caused by DHS, USCIS requires the original incorrect card; a copy is not accepted.',
		confirmationItems: [
			'The incorrect data was caused by DHS, not by information I provided.',
			'I have the original incorrect card and will include that original with the filing.',
		],
	},
	correctBiographicEvidence: {
		label: 'Evidence of the correct name or biographic data',
		fulfillment: 'document',
		acceptedDocumentTypes: ['passport', 'other'],
		guidance:
			'Include the record that proves the correct data, such as the applicable court order, civil record, passport, or other qualifying document.',
		confirmationItems: documentReview,
	},
	nameChangeEvidence: {
		label: 'All registered legal name-change evidence',
		fulfillment: 'document',
		acceptedDocumentTypes: ['other'],
		guidance:
			'Include all applicable registered legal documents, such as a marriage certificate, divorce decree, adoption decree, or court order.',
		confirmationItems: [
			...documentReview,
			'The file includes all legal name-change documents that apply, not only one page or one event.',
		],
	},
}

export function evidenceRequirementFor(requirementKey: string): EvidenceRequirement | undefined {
	return evidenceRequirements[requirementKey]
}
