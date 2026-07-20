import type {
	ApplicationKind,
	FormType,
	I765DraftAnswers,
	I90DraftAnswers,
} from '@convex/shared/applicationShapes'
import { addressShape, personFactsShape } from '@convex/shared/applicationShapes'
import { preReviewStepKeys } from '@convex/shared/interviewSteps'
import {
	I765_CATEGORY_NOT_LISTED,
	isI90CardStatus,
	isSupportedI765Category,
	screenI90,
} from '@convex/shared/screening'
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
		cityOfBirth: string
		stateProvinceOfBirth: string
		countryOfCitizenship: string
		secondCountryOfCitizenship: string
		daytimePhone: string
		email: string
		aNumber: string
		mailingAddress: { street: string; unit: string; city: string; state: string; zipCode: string }
		eligibilityCategory: string
		gender: string
		motherGivenName: string
		fatherGivenName: string
		classOfAdmission: string
		dateOfAdmission: string
		heightFeet: string
		heightInches: string
		weightPounds: string
		eyeColor: string
		hairColor: string
		ethnicity: string
		races: string[]
		locationAppliedVisa: string
		locationIssuedVisa: string
		becameResidentVia: string
		destinationAtAdmission: string
		portOfEntryCityState: string
		everInProceedings: string
		filedI407OrAbandoned: string
	}
	form: {
		previousEadCardNumber: string
		replacementReason: string
		ssn: string
		cardExpirationDate: string
		cardStatus: string
		nameChangedSinceIssuance: string
		previousFamilyName: string
		previousGivenName: string
		previousMiddleName: string
		physicalAddressSameAsMailing: string
		physicalAddress: {
			street: string
			unit: string
			city: string
			state: string
			zipCode: string
			province: string
			postalCode: string
			country: string
		}
		preparedSelfInEnglish: string
		requestingAccommodation: string
		accommodationDeafSignLanguage: string
		accommodationBlindDetail: string
		accommodationOtherDetail: string
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
		cityOfBirth: '',
		stateProvinceOfBirth: '',
		countryOfCitizenship: '',
		secondCountryOfCitizenship: '',
		daytimePhone: '',
		email: '',
		aNumber: '',
		mailingAddress: { street: '', unit: '', city: '', state: '', zipCode: '' },
		eligibilityCategory: '',
		gender: '',
		motherGivenName: '',
		fatherGivenName: '',
		classOfAdmission: '',
		dateOfAdmission: '',
		heightFeet: '',
		heightInches: '',
		weightPounds: '',
		eyeColor: '',
		hairColor: '',
		ethnicity: '',
		races: [],
		locationAppliedVisa: '',
		locationIssuedVisa: '',
		becameResidentVia: '',
		destinationAtAdmission: '',
		portOfEntryCityState: '',
		everInProceedings: '',
		filedI407OrAbandoned: '',
	},
	form: {
		previousEadCardNumber: '',
		replacementReason: '',
		ssn: '',
		cardExpirationDate: '',
		cardStatus: '',
		nameChangedSinceIssuance: '',
		previousFamilyName: '',
		previousGivenName: '',
		previousMiddleName: '',
		physicalAddressSameAsMailing: '',
		physicalAddress: {
			street: '',
			unit: '',
			city: '',
			state: '',
			zipCode: '',
			province: '',
			postalCode: '',
			country: '',
		},
		preparedSelfInEnglish: '',
		requestingAccommodation: '',
		accommodationDeafSignLanguage: '',
		accommodationBlindDetail: '',
		accommodationOtherDetail: '',
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
	const form = answers.form as Partial<
		Omit<Record<keyof InterviewValues['form'], string>, 'physicalAddress'>
	> & { physicalAddress?: Partial<Record<string, string>> }
	return {
		personFacts: {
			givenName: pf.givenName ?? '',
			middleName: pf.middleName ?? '',
			familyName: pf.familyName ?? '',
			dateOfBirth: pf.dateOfBirth ?? '',
			countryOfBirth: pf.countryOfBirth ?? '',
			cityOfBirth: pf.cityOfBirth ?? '',
			stateProvinceOfBirth: pf.stateProvinceOfBirth ?? '',
			countryOfCitizenship: pf.countryOfCitizenship ?? '',
			secondCountryOfCitizenship: pf.secondCountryOfCitizenship ?? '',
			daytimePhone: pf.daytimePhone ?? '',
			email: pf.email ?? '',
			aNumber: pf.aNumber ?? '',
			gender: pf.gender ?? '',
			motherGivenName: pf.motherGivenName ?? '',
			fatherGivenName: pf.fatherGivenName ?? '',
			classOfAdmission: pf.classOfAdmission ?? '',
			dateOfAdmission: pf.dateOfAdmission ?? '',
			heightFeet: pf.heightFeet ?? '',
			heightInches: pf.heightInches ?? '',
			weightPounds: pf.weightPounds ?? '',
			eyeColor: pf.eyeColor ?? '',
			hairColor: pf.hairColor ?? '',
			ethnicity: pf.ethnicity ?? '',
			races: pf.races !== undefined ? [...pf.races] : [],
			locationAppliedVisa: pf.locationAppliedVisa ?? '',
			locationIssuedVisa: pf.locationIssuedVisa ?? '',
			becameResidentVia: pf.becameResidentVia ?? '',
			destinationAtAdmission: pf.destinationAtAdmission ?? '',
			portOfEntryCityState: pf.portOfEntryCityState ?? '',
			everInProceedings: pf.everInProceedings ?? '',
			filedI407OrAbandoned: pf.filedI407OrAbandoned ?? '',
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
			cardStatus: form.cardStatus ?? '',
			nameChangedSinceIssuance: form.nameChangedSinceIssuance ?? '',
			previousFamilyName: form.previousFamilyName ?? '',
			previousGivenName: form.previousGivenName ?? '',
			previousMiddleName: form.previousMiddleName ?? '',
			physicalAddressSameAsMailing: form.physicalAddressSameAsMailing ?? '',
			physicalAddress: {
				street: form.physicalAddress?.street ?? '',
				unit: form.physicalAddress?.unit ?? '',
				city: form.physicalAddress?.city ?? '',
				state: form.physicalAddress?.state ?? '',
				zipCode: form.physicalAddress?.zipCode ?? '',
				province: form.physicalAddress?.province ?? '',
				postalCode: form.physicalAddress?.postalCode ?? '',
				country: form.physicalAddress?.country ?? '',
			},
			preparedSelfInEnglish: form.preparedSelfInEnglish ?? '',
			requestingAccommodation: form.requestingAccommodation ?? '',
			accommodationDeafSignLanguage: form.accommodationDeafSignLanguage ?? '',
			accommodationBlindDetail: form.accommodationBlindDetail ?? '',
			accommodationOtherDetail: form.accommodationOtherDetail ?? '',
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
	cityOfBirth: personFactsShape.shape.cityOfBirth,
	countryOfCitizenship: personFactsShape.shape.countryOfCitizenship,
	// UI accepts separators; buildStepData strips to the digits the shape stores.
	daytimePhone: z
		.string()
		.refine((value) => value.replace(/\D/g, '').length === 10, 'Enter a 10-digit U.S. phone number'),
	email: orEmpty(z.email('Enter a valid email address')),
	// i90 immigration-history / card-details / statement additions. Choice
	// fields share one required-choice rule; the pickers enforce the value sets.
	requiredChoice: z.string().min(1, 'Choose an option'),
	locationAppliedVisa: personFactsShape.shape.locationAppliedVisa,
	locationIssuedVisa: personFactsShape.shape.locationIssuedVisa,
	destinationAtAdmission: personFactsShape.shape.destinationAtAdmission,
	portOfEntryCityState: personFactsShape.shape.portOfEntryCityState,
	previousFamilyName: z.string().min(1, 'Family name is required'),
	previousGivenName: z.string().min(1, 'First name is required'),
	physicalStreet: z.string().min(1, 'Street address is required'),
	physicalCity: z.string().min(1, 'City is required'),
	// i90 personal-details / physical-description (choice sets are enforced by
	// the pickers; these gate required-ness and formats).
	gender: z.string().min(1, 'Choose an option'),
	motherGivenName: personFactsShape.shape.motherGivenName,
	fatherGivenName: personFactsShape.shape.fatherGivenName,
	classOfAdmission: personFactsShape.shape.classOfAdmission,
	dateOfAdmission: personFactsShape.shape.dateOfAdmission,
	heightFeet: z.string().min(1, 'Feet'),
	heightInches: z.string().min(1, 'Inches'),
	weightPounds: personFactsShape.shape.weightPounds,
	eyeColor: z.string().min(1, 'Choose your eye color'),
	hairColor: z.string().min(1, 'Choose your hair color'),
	ethnicity: z.string().min(1, 'Choose an option'),
	races: z.array(z.string()).min(1, 'Select at least one'),
	// Conditional validators return one widened type so TanStack's per-field
	// validator generic unifies across both branches.
	aNumber: (kind: ApplicationKind): z.ZodType<string, string> =>
		kind === 'initial' ? orEmpty(personFactsShape.shape.aNumber) : personFactsShape.shape.aNumber,
	street: addressShape.shape.street,
	city: addressShape.shape.city,
	state: addressShape.shape.state,
	zipCode: addressShape.shape.zipCode,
	eligibilityCategory: z
		.string()
		.min(1, 'Choose your category')
		.refine(
			(value) => isSupportedI765Category(value),
			"This app doesn't prepare that category yet — see the note below.",
		),
	replacementReason: (kind: ApplicationKind): z.ZodType<string, string> =>
		kind === 'replacement'
			? z.string().min(1, 'Choose what happened to your card')
			: orEmpty(z.string()),
	cardExpirationDate: orEmpty(personFactsShape.shape.dateOfBirth),
	// Kind-aware: the value set is enforced by the radio options; the refine
	// blocks the one unsupported combination (conditional resident + renewal,
	// shared/screening.ts) with an inline explanation below the field.
	cardStatus: (kind: ApplicationKind): z.ZodType<string, string> =>
		z
			.string()
			.min(1, 'Choose your card type')
			.refine(
				(value) => !isI90CardStatus(value) || screenI90(value, kind).supported,
				"A 2-year conditional card can't be renewed with Form I-90 — see the note below.",
			),
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
		help: 'Enter your birthplace as it appears on your passport or birth certificate, even if the country has since changed its name.',
		fieldPaths: [
			'personFacts.cityOfBirth',
			'personFacts.stateProvinceOfBirth',
			'personFacts.countryOfBirth',
		],
		buildStepData: (values) => ({
			personFacts: dropEmpty({
				cityOfBirth: values.personFacts.cityOfBirth,
				stateProvinceOfBirth: values.personFacts.stateProvinceOfBirth,
				countryOfBirth: values.personFacts.countryOfBirth,
			}),
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
			// i90-only (Part 1 Item 7): the physical-address question; the UI
			// renders these only for I-90, so I-765 saves emit no form keys.
			'form.physicalAddressSameAsMailing',
			'form.physicalAddress.street',
			'form.physicalAddress.unit',
			'form.physicalAddress.city',
			'form.physicalAddress.state',
			'form.physicalAddress.zipCode',
			'form.physicalAddress.province',
			'form.physicalAddress.postalCode',
			'form.physicalAddress.country',
		],
		buildStepData: (values) => {
			const address = values.personFacts.mailingAddress
			const same = values.form.physicalAddressSameAsMailing
			const physical = values.form.physicalAddress
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
				form: {
					...dropEmpty({ physicalAddressSameAsMailing: same }),
					...(same === 'no'
						? {
								physicalAddress: {
									street: physical.street,
									city: physical.city,
									...dropEmpty({
										unit: physical.unit,
										state: physical.state,
										zipCode: physical.zipCode,
										province: physical.province,
										postalCode: physical.postalCode,
										country: physical.country,
									}),
								},
							}
						: {}),
				} as StepData['form'],
			}
		},
	},
]

/** I-765 only (Item 14): citizenship is distinct from country of birth. */
const citizenshipStep: StepDescriptor = {
	key: 'citizenship',
	question: 'What country are you a citizen of?',
	help: 'List every country where you are currently a citizen or national. If you are stateless, enter the country where you were last a citizen.',
	fieldPaths: ['personFacts.countryOfCitizenship', 'personFacts.secondCountryOfCitizenship'],
	buildStepData: (values) => ({
		personFacts: dropEmpty({
			countryOfCitizenship: values.personFacts.countryOfCitizenship,
			secondCountryOfCitizenship: values.personFacts.secondCountryOfCitizenship,
		}),
	}),
}

/** Both forms: USCIS applicant contact block (I-765 Part 3 / I-90 Part 5). */
const contactInfoStep: StepDescriptor = {
	key: 'contact-info',
	question: 'How can USCIS reach you?',
	help: 'USCIS may need to call about your application. Use a daytime phone number you actually answer; email is optional but recommended.',
	fieldPaths: ['personFacts.daytimePhone', 'personFacts.email'],
	buildStepData: (values) => ({
		personFacts: dropEmpty({
			// The shape stores digits only; the field accepts human formatting.
			daytimePhone: values.personFacts.daytimePhone.replace(/\D/g, ''),
			email: values.personFacts.email.trim(),
		}),
	}),
}

/** I-90 only: Part 1 Additional Information (all required printed items). */
const personalDetailsStep: StepDescriptor = {
	key: 'personal-details',
	question: 'A few details about you',
	help: 'USCIS uses these to match your immigration record. Your class of admission is the category code printed on your Green Card under "Category" (for example IR1); your date of admission is the "Resident Since" date.',
	fieldPaths: [
		'personFacts.gender',
		'personFacts.motherGivenName',
		'personFacts.fatherGivenName',
		'personFacts.classOfAdmission',
		'personFacts.dateOfAdmission',
	],
	buildStepData: (values) => ({
		// The pickers restrict the values to the shared enums; the string-typed
		// form state needs the cast back to the shaped slice.
		personFacts: dropEmpty({
			gender: values.personFacts.gender,
			motherGivenName: values.personFacts.motherGivenName,
			fatherGivenName: values.personFacts.fatherGivenName,
			classOfAdmission: values.personFacts.classOfAdmission.trim().toUpperCase(),
			dateOfAdmission: values.personFacts.dateOfAdmission,
		}) as StepData['personFacts'],
	}),
}

/** I-90 only: Part 3 Processing Information (Items 1-5). */
const immigrationHistoryStep: StepDescriptor = {
	key: 'immigration-history',
	question: 'How you became a permanent resident',
	help: 'These match your original immigrant-visa or adjustment-of-status record. If you don\'t remember an exact office name, use the city and country (for example "Ciudad Juarez, Mexico") or the USCIS office (for example "USCIS Chicago").',
	fieldPaths: [
		'personFacts.locationAppliedVisa',
		'personFacts.locationIssuedVisa',
		'personFacts.becameResidentVia',
		'personFacts.destinationAtAdmission',
		'personFacts.portOfEntryCityState',
		'personFacts.everInProceedings',
		'personFacts.filedI407OrAbandoned',
	],
	buildStepData: (values) => {
		const via = values.personFacts.becameResidentVia
		return {
			personFacts: dropEmpty({
				locationAppliedVisa: values.personFacts.locationAppliedVisa,
				locationIssuedVisa: values.personFacts.locationIssuedVisa,
				becameResidentVia: via,
				// Items 3.A/3.A.1 apply only to immigrant-visa entries.
				...(via === 'immigrantVisa'
					? {
							destinationAtAdmission: values.personFacts.destinationAtAdmission,
							portOfEntryCityState: values.personFacts.portOfEntryCityState,
						}
					: {}),
				everInProceedings: values.personFacts.everInProceedings,
				filedI407OrAbandoned: values.personFacts.filedI407OrAbandoned,
			}) as StepData['personFacts'],
		}
	},
}

/** I-90 only: Part 5 statement + Part 4 accommodations. */
const applicantStatementStep: StepDescriptor = {
	key: 'applicant-statement',
	question: 'A few final declarations',
	help: 'The official form asks how you prepared this application and whether you need an accommodation from USCIS because of a disability or impairment.',
	fieldPaths: [
		'form.preparedSelfInEnglish',
		'form.requestingAccommodation',
		'form.accommodationDeafSignLanguage',
		'form.accommodationBlindDetail',
		'form.accommodationOtherDetail',
	],
	buildStepData: (values) => {
		const requesting = values.form.requestingAccommodation
		return {
			form: {
				...dropEmpty({
					preparedSelfInEnglish: values.form.preparedSelfInEnglish,
					requestingAccommodation: requesting,
				}),
				...(requesting === 'yes'
					? dropEmpty({
							accommodationDeafSignLanguage: values.form.accommodationDeafSignLanguage,
							accommodationBlindDetail: values.form.accommodationBlindDetail,
							accommodationOtherDetail: values.form.accommodationOtherDetail,
						})
					: {}),
			} as StepData['form'],
		}
	},
}

/** I-90 only: Part 3 Biographic Information. */
const physicalDescriptionStep: StepDescriptor = {
	key: 'physical-description',
	question: 'Your physical description',
	help: 'USCIS collects this biographic information for identity verification. Answer as it would appear on official records.',
	fieldPaths: [
		'personFacts.heightFeet',
		'personFacts.heightInches',
		'personFacts.weightPounds',
		'personFacts.eyeColor',
		'personFacts.hairColor',
		'personFacts.ethnicity',
		'personFacts.races',
	],
	buildStepData: (values) => {
		const races = values.personFacts.races
		return {
			personFacts: {
				...dropEmpty({
					heightFeet: values.personFacts.heightFeet,
					heightInches: values.personFacts.heightInches,
					weightPounds: values.personFacts.weightPounds.replace(/\D/g, ''),
					eyeColor: values.personFacts.eyeColor,
					hairColor: values.personFacts.hairColor,
					ethnicity: values.personFacts.ethnicity,
				}),
				...(races.length > 0 ? { races } : {}),
			} as StepData['personFacts'],
		}
	},
}

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
	help: 'Confirm what kind of card you have and find the expiration date on its front. If your name has legally changed since the card was issued, we also need the name printed on it.',
	fieldPaths: [
		'form.cardStatus',
		'form.cardExpirationDate',
		'form.replacementReason',
		'form.nameChangedSinceIssuance',
		'form.previousFamilyName',
		'form.previousGivenName',
		'form.previousMiddleName',
	],
	buildStepData: (values, kind) => ({
		form: {
			...dropEmpty({
				cardStatus: values.form.cardStatus,
				cardExpirationDate: values.form.cardExpirationDate,
				nameChangedSinceIssuance: values.form.nameChangedSinceIssuance,
			}),
			// Items 5.A-5.C apply only when the name has legally changed.
			...(values.form.nameChangedSinceIssuance === 'yes'
				? dropEmpty({
						previousFamilyName: values.form.previousFamilyName,
						previousGivenName: values.form.previousGivenName,
						previousMiddleName: values.form.previousMiddleName,
					})
				: {}),
			...(kind === 'replacement'
				? dropEmpty({ replacementReason: values.form.replacementReason })
				: {}),
		} as StepData['form'],
	}),
}

// sharedSteps order: [legal-name, date-of-birth, country-of-birth, a-number,
// mailing-address]. The blueprint-sync unit test pins these composites against
// interviewSteps.ts, so a drifted splice fails CI instead of shipping.
const descriptorsByForm: Record<FormType, readonly StepDescriptor[]> = {
	i765: [
		...sharedSteps.slice(0, 3),
		citizenshipStep,
		...sharedSteps.slice(3),
		contactInfoStep,
		i765FinalStep,
	],
	i90: [
		...sharedSteps.slice(0, 3),
		personalDetailsStep,
		immigrationHistoryStep,
		...sharedSteps.slice(3),
		contactInfoStep,
		physicalDescriptionStep,
		i90FinalStep,
		applicantStatementStep,
	],
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

// The picker mirrors shared/screening.ts supportedI765Categories exactly (a
// unit test pins the two in sync) plus the "not listed" stop, which can never
// validate — it exists to explain the boundary instead of hiding it.
export const eligibilityCategoryOptions = [
	{ value: 'C08', label: 'C08 — Pending asylum application' },
	{ value: 'C09', label: 'C09 — Pending green card application' },
	{ value: 'C10', label: 'C10 — Cancellation of removal' },
	{ value: 'C33', label: 'C33 — DACA' },
	{ value: 'A05', label: 'A05 — Asylum granted' },
	{ value: 'A03', label: 'A03 — Refugee' },
	{ value: 'A17', label: 'A17 — Spouse of E visa holder' },
	{ value: 'C26', label: 'C26 — Spouse of H-1B holder' },
	{ value: I765_CATEGORY_NOT_LISTED, label: "My category isn't listed" },
] as const

/** I-90 card/status options (Part 2 Item 1), shared by the new-application
 * pre-screen and the card-details step. */
export const cardStatusOptions = [
	{
		value: 'permanentResident',
		label: '10-year Permanent Resident Card',
		description: 'Lawful permanent resident',
	},
	{
		value: 'commuter',
		label: 'Commuter Green Card',
		description: 'Permanent resident in commuter status',
	},
	{
		value: 'conditionalResident',
		label: '2-year conditional card',
		description: 'Conditional permanent resident (for example CR1, CR2, CF1, CF2)',
	},
] as const

// I-90 biographic pickers — values mirror the applicationShapes enums (pinned
// by unit test), labels mirror the printed form's option text.
export const genderOptions = [
	{ value: 'male', label: 'Male' },
	{ value: 'female', label: 'Female' },
] as const

export const heightFeetOptions = ['2', '3', '4', '5', '6', '7', '8'].map((value) => ({
	value,
	label: `${value} ft`,
}))

export const heightInchesOptions = Array.from({ length: 12 }, (_, index) => ({
	value: String(index),
	label: `${index} in`,
}))

export const eyeColorOptions = [
	{ value: 'black', label: 'Black' },
	{ value: 'blue', label: 'Blue' },
	{ value: 'brown', label: 'Brown' },
	{ value: 'gray', label: 'Gray' },
	{ value: 'green', label: 'Green' },
	{ value: 'hazel', label: 'Hazel' },
	{ value: 'maroon', label: 'Maroon' },
	{ value: 'pink', label: 'Pink' },
	{ value: 'unknownOrOther', label: 'Unknown / other' },
] as const

export const hairColorOptions = [
	{ value: 'bald', label: 'Bald (no hair)' },
	{ value: 'black', label: 'Black' },
	{ value: 'blond', label: 'Blond' },
	{ value: 'brown', label: 'Brown' },
	{ value: 'gray', label: 'Gray' },
	{ value: 'red', label: 'Red' },
	{ value: 'sandy', label: 'Sandy' },
	{ value: 'white', label: 'White' },
	{ value: 'unknownOrOther', label: 'Unknown / other' },
] as const

export const ethnicityOptions = [
	{ value: 'hispanicOrLatino', label: 'Hispanic or Latino' },
	{ value: 'notHispanicOrLatino', label: 'Not Hispanic or Latino' },
] as const

export const raceOptions = [
	{ value: 'americanIndianOrAlaskaNative', label: 'American Indian or Alaska Native' },
	{ value: 'asian', label: 'Asian' },
	{ value: 'blackOrAfricanAmerican', label: 'Black or African American' },
	{ value: 'nativeHawaiianOrOtherPacificIslander', label: 'Native Hawaiian or Other Pacific Islander' },
	{ value: 'white', label: 'White' },
] as const

export const yesNoOptions = [
	{ value: 'yes', label: 'Yes' },
	{ value: 'no', label: 'No' },
] as const

export const residencyPathOptions = [
	{
		value: 'immigrantVisa',
		label: 'With an immigrant visa',
		description: 'You entered the U.S. at a port of entry using an immigrant visa',
	},
	{
		value: 'adjustmentOfStatus',
		label: 'Adjustment of status',
		description: 'You were already in the U.S. and USCIS granted your green card',
	},
] as const

export const nameChangeOptions = [
	{ value: 'no', label: 'No' },
	{ value: 'yes', label: 'Yes', description: 'Attach evidence of the legal name change when you file' },
	{ value: 'neverReceivedCard', label: 'Not applicable — I never received my previous card' },
] as const

export const replacementReasonOptions = (formType: FormType) => [
	{ value: 'lost', label: 'It was lost' },
	{ value: 'stolen', label: 'It was stolen' },
	{ value: 'damaged', label: 'It was damaged' },
	{ value: 'error', label: 'It has a mistake on it' },
	...(formType === 'i90' ? [{ value: 'nameChange', label: 'My name changed' }] : []),
]
