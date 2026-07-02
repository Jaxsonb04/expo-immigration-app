import { z } from 'zod/v4'

// Single-source Zod shapes for application data (ADR-0005, ADR-0013): these
// shapes derive the Convex storage validators via zodToConvex AND the
// interview's per-step validation schemas (strict .pick()/.required()
// projections). Do not re-declare field shapes elsewhere.

export const formTypes = ['i765', 'i90'] as const
export type FormType = (typeof formTypes)[number]

export const applicationKinds = ['initial', 'renewal', 'replacement'] as const
export type ApplicationKind = (typeof applicationKinds)[number]

// The five supported situations (ADR-0003 as amended): I-90 has no "initial".
export const supportedSituations: readonly { formType: FormType; applicationKind: ApplicationKind }[] = [
	{ formType: 'i765', applicationKind: 'initial' },
	{ formType: 'i765', applicationKind: 'renewal' },
	{ formType: 'i765', applicationKind: 'replacement' },
	{ formType: 'i90', applicationKind: 'renewal' },
	{ formType: 'i90', applicationKind: 'replacement' },
]

export const isSupportedSituation = (formType: FormType, applicationKind: ApplicationKind) =>
	supportedSituations.some((s) => s.formType === formType && s.applicationKind === applicationKind)

const isoDate = z.iso.date('Enter a valid date')

export const addressShape = z.object({
	street: z.string().min(1, 'Street address is required'),
	unit: z.string().optional(),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(2, 'Use the 2-letter state code'),
	zipCode: z.string().min(5, 'Enter a 5-digit ZIP code'),
})

// Person-facts: the projection that promotes draft → applicant profile when
// the user reaches Review (ADR-0014). The interview never writes these to the
// applicant row directly; promotion copies them, latest promotion wins.
export const personFactsShape = z.object({
	givenName: z.string().min(1, 'First name is required'),
	middleName: z.string().optional(),
	familyName: z.string().min(1, 'Family name is required'),
	dateOfBirth: isoDate,
	countryOfBirth: z.string().min(1, 'Country of birth is required'),
	aNumber: z
		.string()
		.regex(/^\d{7,9}$/, 'An A-Number is 7 to 9 digits'),
	mailingAddress: addressShape,
	// Person-level per the glossary (identifies the legal basis the person
	// qualifies under); only I-765 interviews collect it.
	eligibilityCategory: z.string().optional(),
})

// Application-specific answers: never promoted, die with the application.
export const i765SpecificsShape = z.object({
	previousEadCardNumber: z.string().optional(),
	replacementReason: z.enum(['lost', 'stolen', 'damaged', 'error']).optional(),
	ssn: z.string().optional(),
})

export const i90SpecificsShape = z.object({
	cardExpirationDate: isoDate.optional(),
	replacementReason: z.enum(['lost', 'stolen', 'damaged', 'error', 'nameChange']).optional(),
})

// Draft answers are partial by nature — steps fill them in incrementally and
// the strict per-step schemas (interview modules) enforce completeness.
export const i765DraftAnswersShape = z.object({
	personFacts: personFactsShape.partial(),
	form: i765SpecificsShape.partial(),
})

export const i90DraftAnswersShape = z.object({
	personFacts: personFactsShape.partial(),
	form: i90SpecificsShape.partial(),
})

export type PersonFacts = z.infer<typeof personFactsShape>
export type I765DraftAnswers = z.infer<typeof i765DraftAnswersShape>
export type I90DraftAnswers = z.infer<typeof i90DraftAnswersShape>

export const emptyDraftAnswers = { personFacts: {}, form: {} }

export const documentTypes = [
	'passport',
	'ead',
	'permanentResidentCard',
	'i94',
	'socialSecurityCard',
	'photo',
	'other',
] as const
export type DocumentType = (typeof documentTypes)[number]

export const applicationStatuses = ['draft', 'filed', 'closed'] as const
export type ApplicationStatus = (typeof applicationStatuses)[number]

export const requirementStatuses = ['needed', 'attached', 'waived'] as const
export type RequirementStatus = (typeof requirementStatuses)[number]

// Canonical case statuses (ADR-0008), in pipeline order.
export const caseStatuses = [
	'caseReceived',
	'biometrics',
	'requestForEvidence',
	'approved',
	'cardBeingProduced',
	'cardMailed',
	'cardDelivered',
] as const
export type CaseStatus = (typeof caseStatuses)[number]

export const terminalCaseStatuses: readonly CaseStatus[] = ['approved', 'cardMailed', 'cardDelivered']

export const entitlementStatuses = ['active', 'revoked'] as const
export const entitlementSources = ['revenuecat', 'devStub'] as const

// Filing window (decision 8): a document expiring within this many days is an
// attention item. Matches the I-765 renewal window (~180 days before expiry).
export const filingWindowDays = 180
