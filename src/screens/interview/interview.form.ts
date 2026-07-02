import type {
	ApplicationKind,
	FormType,
	I765DraftAnswers,
	I90DraftAnswers,
} from '@convex/shared/applicationShapes'
import { addressShape, personFactsShape } from '@convex/shared/applicationShapes'
import { preReviewStepKeys } from '@convex/shared/interviewSteps'
import type { DeepKeys } from '@tanstack/react-form'
import { formOptions } from '@tanstack/react-form'
import { z } from 'zod/v4'

// Pure interview metadata — no React Native imports, so it unit-tests in
// vitest. Step BODIES live in steps/ (one component per file); the two are
// joined by step key. Field constraints are projections of the shared Zod
// single-source shapes (ADR-0013) — never re-declared.

/**
 * The single form instance's value shape (ADR-0013): fully defaulted strings
 * so every field is controlled; empties are stripped when building the
 * Next-save payload.
 */
export type InterviewValues = {
	personFacts: {
		givenName: string
		middleName: string
		familyName: string
		dateOfBirth: string
		countryOfBirth: string
		aNumber: string
		mailingAddress: { street: string; unit: string; city: string; state: string; zipCode: string }
		eligibilityCategory: string
	}
	form: {
		previousEadCardNumber: string
		replacementReason: string
		ssn: string
		cardExpirationDate: string
	}
}

/** Payload slice for `saveApplicationStep` — matches the mutation validator. */
export type StepData = {
	personFacts?: I765DraftAnswers['personFacts']
	form?: I765DraftAnswers['form'] | I90DraftAnswers['form']
}

export type InterviewFieldPath = DeepKeys<InterviewValues>

export type StepDescriptor = {
	key: string
	question: string
	help: string
	/** Paths validated (and marked touched) when Next is pressed. */
	fieldPaths: readonly InterviewFieldPath[]
	/** Slice of the form values persisted by this step's Next-save. */
	buildStepData: (values: InterviewValues, applicationKind: ApplicationKind) => StepData
}

export const emptyInterviewValues: InterviewValues = {
	personFacts: {
		givenName: '',
		middleName: '',
		familyName: '',
		dateOfBirth: '',
		countryOfBirth: '',
		aNumber: '',
		mailingAddress: { street: '', unit: '', city: '', state: '', zipCode: '' },
		eligibilityCategory: '',
	},
	form: {
		previousEadCardNumber: '',
		replacementReason: '',
		ssn: '',
		cardExpirationDate: '',
	},
}

/**
 * Shared form options: the ONE `useAppForm` instance (screen) and every
 * `withForm` step body derive from these, so their types line up (ADR-0013).
 */
export const interviewFormOptions = formOptions({ defaultValues: emptyInterviewValues })

type DraftAnswers = I765DraftAnswers | I90DraftAnswers

/** Seed the form from the persisted draft (itself profile-seeded at creation). */
export function seedFromDraft(answers: DraftAnswers): InterviewValues {
	const pf = answers.personFacts
	const form = answers.form as Partial<Record<keyof InterviewValues['form'], string>>
	return {
		personFacts: {
			givenName: pf.givenName ?? '',
			middleName: pf.middleName ?? '',
			familyName: pf.familyName ?? '',
			dateOfBirth: pf.dateOfBirth ?? '',
			countryOfBirth: pf.countryOfBirth ?? '',
			aNumber: pf.aNumber ?? '',
			mailingAddress: {
				street: pf.mailingAddress?.street ?? '',
				unit: pf.mailingAddress?.unit ?? '',
				city: pf.mailingAddress?.city ?? '',
				state: pf.mailingAddress?.state ?? '',
				zipCode: pf.mailingAddress?.zipCode ?? '',
			},
			eligibilityCategory: pf.eligibilityCategory ?? '',
		},
		form: {
			previousEadCardNumber: form.previousEadCardNumber ?? '',
			replacementReason: form.replacementReason ?? '',
			ssn: form.ssn ?? '',
			cardExpirationDate: form.cardExpirationDate ?? '',
		},
	}
}

const orEmpty = <T extends z.ZodType<string, string>>(schema: T) => z.union([schema, z.literal('')])

/**
 * Field validators, projected from the shared shapes. Kind-aware where the
 * requirement genuinely depends on the situation (an initial work-permit
 * applicant may not have an A-Number yet).
 */
export const fieldValidators = {
	givenName: personFactsShape.shape.givenName,
	familyName: personFactsShape.shape.familyName,
	dateOfBirth: personFactsShape.shape.dateOfBirth,
	countryOfBirth: personFactsShape.shape.countryOfBirth,
	// Conditional validators return one widened type so TanStack's per-field
	// validator generic unifies across both branches.
	aNumber: (kind: ApplicationKind): z.ZodType<string, string> =>
		kind === 'initial' ? orEmpty(personFactsShape.shape.aNumber) : personFactsShape.shape.aNumber,
	street: addressShape.shape.street,
	city: addressShape.shape.city,
	state: addressShape.shape.state,
	zipCode: addressShape.shape.zipCode,
	eligibilityCategory: z.string().min(1, 'Choose your category'),
	replacementReason: (kind: ApplicationKind): z.ZodType<string, string> =>
		kind === 'replacement'
			? z.string().min(1, 'Choose what happened to your card')
			: orEmpty(z.string()),
	cardExpirationDate: orEmpty(personFactsShape.shape.dateOfBirth),
}

const dropEmpty = <T extends Record<string, string>>(record: T): Partial<T> =>
	Object.fromEntries(Object.entries(record).filter(([, value]) => value !== '')) as Partial<T>

const sharedSteps: StepDescriptor[] = [
	{
		key: 'legal-name',
		question: 'What is your legal name?',
		help: 'Use your name exactly as it appears on your immigration documents. If your name has changed, use your current legal name — you can note prior names later.',
		fieldPaths: ['personFacts.givenName', 'personFacts.middleName', 'personFacts.familyName'],
		buildStepData: (values) => ({
			personFacts: dropEmpty({
				givenName: values.personFacts.givenName,
				middleName: values.personFacts.middleName,
				familyName: values.personFacts.familyName,
			}),
		}),
	},
	{
		key: 'date-of-birth',
		question: 'When were you born?',
		help: 'Use your date of birth exactly as it appears on your passport or birth certificate.',
		fieldPaths: ['personFacts.dateOfBirth'],
		buildStepData: (values) => ({
			personFacts: dropEmpty({ dateOfBirth: values.personFacts.dateOfBirth }),
		}),
	},
	{
		key: 'country-of-birth',
		question: 'Where were you born?',
		help: 'Enter the country of birth as it appears on your passport, even if that country has since changed its name.',
		fieldPaths: ['personFacts.countryOfBirth'],
		buildStepData: (values) => ({
			personFacts: dropEmpty({ countryOfBirth: values.personFacts.countryOfBirth }),
		}),
	},
	{
		key: 'a-number',
		question: 'What is your A-Number?',
		help: 'Your Alien Registration Number starts with "A" followed by 7–9 digits. Find it on your Green Card, EAD, or any USCIS notice. If this is your first work permit and you don\'t have one yet, leave it blank.',
		fieldPaths: ['personFacts.aNumber'],
		buildStepData: (values) => ({
			personFacts: dropEmpty({ aNumber: values.personFacts.aNumber }),
		}),
	},
	{
		key: 'mailing-address',
		question: 'Where should USCIS send your mail?',
		help: 'Use an address where you can reliably receive mail for the next several months — USCIS sends your receipt notice, biometrics appointment, and your new card here.',
		fieldPaths: [
			'personFacts.mailingAddress.street',
			'personFacts.mailingAddress.unit',
			'personFacts.mailingAddress.city',
			'personFacts.mailingAddress.state',
			'personFacts.mailingAddress.zipCode',
		],
		buildStepData: (values) => {
			const address = values.personFacts.mailingAddress
			return {
				personFacts: {
					mailingAddress: {
						street: address.street,
						...(address.unit === '' ? {} : { unit: address.unit }),
						city: address.city,
						state: address.state,
						zipCode: address.zipCode,
					},
				},
			}
		},
	},
]

const i765FinalStep: StepDescriptor = {
	key: 'eligibility-category',
	question: 'What is your eligibility category?',
	help: 'Your category is the code that says why you qualify for a work permit. Find it on your current EAD under "Category". If you\'re replacing a card, also tell us what happened to it.',
	fieldPaths: ['personFacts.eligibilityCategory', 'form.replacementReason'],
	buildStepData: (values, kind) => ({
		personFacts: dropEmpty({ eligibilityCategory: values.personFacts.eligibilityCategory }),
		form:
			kind === 'replacement'
				? (dropEmpty({ replacementReason: values.form.replacementReason }) as StepData['form'])
				: {},
	}),
}

const i90FinalStep: StepDescriptor = {
	key: 'card-details',
	question: 'Tell us about your current card',
	help: 'Find the expiration date on the front of your Permanent Resident Card. If you\'re replacing the card, also tell us what happened to it.',
	fieldPaths: ['form.cardExpirationDate', 'form.replacementReason'],
	buildStepData: (values, kind) => ({
		form: {
			...dropEmpty({ cardExpirationDate: values.form.cardExpirationDate }),
			...(kind === 'replacement'
				? dropEmpty({ replacementReason: values.form.replacementReason })
				: {}),
		} as StepData['form'],
	}),
}

const descriptorsByForm: Record<FormType, readonly StepDescriptor[]> = {
	i765: [...sharedSteps, i765FinalStep],
	i90: [...sharedSteps, i90FinalStep],
}

/**
 * The visible interview steps for a form family — every pre-Review blueprint
 * step, in blueprint order (asserted by unit tests so the server's
 * saveApplicationStep never rejects a key we render).
 */
export function stepDescriptorsFor(formType: FormType): readonly StepDescriptor[] {
	return descriptorsByForm[formType]
}

/** First incomplete step index — where the wizard resumes. */
export function initialStepIndex(formType: FormType, currentStepKey: string | undefined): number {
	const index = descriptorsByForm[formType].findIndex((step) => step.key === currentStepKey)
	return index === -1 ? 0 : index
}

// Re-export so tests can assert descriptor/blueprint alignment through one import.
export { preReviewStepKeys }

export const eligibilityCategoryOptions = [
	{ value: 'C08', label: 'C08 — Pending asylum application' },
	{ value: 'C09', label: 'C09 — Pending green card application' },
	{ value: 'C10', label: 'C10 — Cancellation of removal' },
	{ value: 'C33', label: 'C33 — DACA' },
	{ value: 'A05', label: 'A05 — Asylum granted' },
	{ value: 'A03', label: 'A03 — Refugee' },
	{ value: 'A17', label: 'A17 — Spouse of E visa holder' },
	{ value: 'C26', label: 'C26 — Spouse of H-1B holder' },
] as const

export const replacementReasonOptions = (formType: FormType) => [
	{ value: 'lost', label: 'It was lost' },
	{ value: 'stolen', label: 'It was stolen' },
	{ value: 'damaged', label: 'It was damaged' },
	{ value: 'error', label: 'It has a mistake on it' },
	...(formType === 'i90' ? [{ value: 'nameChange', label: 'My name changed' }] : []),
]
