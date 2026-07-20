import { formatIsoDate } from '@/lib/application-labels'
import {
	cardStatusOptions,
	eligibilityCategoryOptions,
	ethnicityOptions,
	eyeColorOptions,
	genderOptions,
	hairColorOptions,
	heightFeetOptions,
	maritalStatusOptions,
	heightInchesOptions,
	nameChangeOptions,
	raceOptions,
	replacementReasonOptions,
	residencyPathOptions,
	yesNoOptions,
} from '@/screens/interview/interview.form'
import type { FormType } from '@convex/shared/applicationShapes'
import type { GroupBlockerCode } from '@convex/shared/reviewModel'

// Client-only display layer for the review screen — kept OUT of reviewModel.ts
// so that module stays server-safe. Reuses the interview's own option lists and
// the shared label helpers so a value renders exactly as it was offered.

const ROW_LABELS: Record<string, string> = {
	givenName: 'First name',
	middleName: 'Middle name',
	familyName: 'Family name',
	dateOfBirth: 'Date of birth',
	countryOfBirth: 'Country of birth',
	cityOfBirth: 'City of birth',
	stateProvinceOfBirth: 'State / province of birth',
	countryOfCitizenship: 'Country of citizenship',
	secondCountryOfCitizenship: 'Second citizenship',
	daytimePhone: 'Daytime phone',
	email: 'Email',
	aNumber: 'A-Number',
	mailingAddress: 'Mailing address',
	eligibilityCategory: 'Eligibility category',
	gender: 'Sex',
	hasUsedOtherNames: 'Used other names',
	otherNames: 'Other names',
	i94Number: 'I-94 number',
	usedTravelDocument: 'Used a passport / travel document',
	passportNumber: 'Passport number',
	travelDocNumber: 'Travel document number',
	travelDocCountryOfIssuance: 'Issuing country',
	travelDocExpirationDate: 'Document expiration',
	dateOfLastEntry: 'Date of last entry',
	placeOfLastEntry: 'Place of last arrival',
	statusAtLastEntry: 'Status at last arrival',
	currentImmigrationStatus: 'Current immigration status',
	sevisNumber: 'SEVIS number',
	c26SpouseReceiptNumber: "Spouse's H-1B receipt number",
	c8EverArrestedOrConvicted: 'Ever arrested or convicted',
	maritalStatus: 'Marital status',
	previouslyFiledI765: 'Previously filed Form I-765',
	motherGivenName: "Mother's first name",
	fatherGivenName: "Father's first name",
	classOfAdmission: 'Class of admission',
	dateOfAdmission: 'Date of admission',
	heightFeet: 'Height (feet)',
	heightInches: 'Height (inches)',
	weightPounds: 'Weight',
	eyeColor: 'Eye color',
	hairColor: 'Hair color',
	ethnicity: 'Ethnicity',
	races: 'Race',
	locationAppliedVisa: 'Where you applied',
	locationIssuedVisa: 'Where it was issued',
	becameResidentVia: 'How you became a resident',
	destinationAtAdmission: 'Destination at admission',
	portOfEntryCityState: 'Port of entry',
	everInProceedings: 'Removal proceedings',
	filedI407OrAbandoned: 'Abandoned residence',
	physicalAddressSameAsMailing: 'Live at mailing address',
	physicalAddress: 'Physical address',
	cardStatus: 'Card type',
	cardExpirationDate: 'Card expiration',
	replacementReason: 'What happened to your card',
	nameChangedSinceIssuance: 'Name changed since issuance',
	previousFamilyName: 'Family name on card',
	previousGivenName: 'First name on card',
	previousMiddleName: 'Middle name on card',
	preparedSelfInEnglish: 'Prepared it yourself in English',
	requestingAccommodation: 'Requesting an accommodation',
	accommodationDeafSignLanguage: 'Deaf or hard of hearing',
	accommodationBlindDetail: 'Blind or low vision',
	accommodationOtherDetail: 'Other accommodation',
}

export function labelFor(key: string): string {
	return ROW_LABELS[key] ?? key
}

type Option = { value: string; label: string }

function fromOptions(options: readonly Option[], raw: unknown): string {
	if (typeof raw !== 'string') return String(raw)
	return options.find((o) => o.value === raw)?.label ?? raw
}

function optionsForEnumKey(formType: FormType, key: string): readonly Option[] | undefined {
	switch (key) {
		case 'gender':
			return genderOptions
		case 'maritalStatus':
			return maritalStatusOptions
		case 'eyeColor':
			return eyeColorOptions
		case 'hairColor':
			return hairColorOptions
		case 'ethnicity':
			return ethnicityOptions
		case 'cardStatus':
			return cardStatusOptions
		case 'eligibilityCategory':
			return eligibilityCategoryOptions
		case 'becameResidentVia':
			return residencyPathOptions
		case 'nameChangedSinceIssuance':
			return nameChangeOptions
		case 'replacementReason':
			return replacementReasonOptions(formType)
		case 'heightFeet':
			return heightFeetOptions
		case 'heightInches':
			return heightInchesOptions
		case 'everInProceedings':
		case 'filedI407OrAbandoned':
		case 'physicalAddressSameAsMailing':
		case 'preparedSelfInEnglish':
		case 'requestingAccommodation':
		case 'previouslyFiledI765':
		case 'hasUsedOtherNames':
		case 'usedTravelDocument':
		case 'c8EverArrestedOrConvicted':
			return yesNoOptions
		default:
			return undefined
	}
}

function get(record: unknown, field: string): string {
	const value = (record as Record<string, unknown> | null)?.[field]
	return typeof value === 'string' ? value.trim() : ''
}

function composeMailingAddress(raw: unknown): string {
	const street = get(raw, 'street')
	const unit = get(raw, 'unit')
	const city = get(raw, 'city')
	const state = get(raw, 'state')
	const zip = get(raw, 'zipCode')
	const line1 = [street, unit].filter(Boolean).join(', ')
	const line2 = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
	return [line1, line2].filter(Boolean).join(', ')
}

function composePhysicalAddress(raw: unknown): string {
	const street = get(raw, 'street')
	const unit = get(raw, 'unit')
	const city = get(raw, 'city')
	const state = get(raw, 'state')
	const zip = get(raw, 'zipCode')
	const province = get(raw, 'province')
	const postal = get(raw, 'postalCode')
	const country = get(raw, 'country')
	const line1 = [street, unit].filter(Boolean).join(', ')
	// US vs foreign: a state+ZIP reads as a domestic line, otherwise show the
	// province/postal/country the applicant provided.
	const locality =
		state || zip
			? [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
			: [city, province, postal, country].filter(Boolean).join(', ')
	return [line1, locality].filter(Boolean).join(', ')
}

function formatPhone(raw: string): string {
	const digits = raw.replace(/\D/g, '')
	if (digits.length !== 10) return raw
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Turn a stored answer value into the string the review screen shows. */
export function formatValue(formType: FormType, key: string, raw: unknown): string {
	if (key === 'mailingAddress') return composeMailingAddress(raw)
	if (key === 'physicalAddress') return composePhysicalAddress(raw)
	if (key === 'races' && Array.isArray(raw)) {
		return raw.map((value) => fromOptions(raceOptions, value)).join(', ')
	}
	if (key === 'otherNames' && Array.isArray(raw)) {
		return raw
			.map((row) => {
				const r = row as Record<string, unknown>
				return [r.givenName, r.middleName, r.familyName]
					.filter((v) => typeof v === 'string' && v !== '')
					.join(' ')
			})
			.join('; ')
	}
	if (
		key === 'dateOfBirth' ||
		key === 'dateOfAdmission' ||
		key === 'cardExpirationDate' ||
		key === 'dateOfLastEntry' ||
		key === 'travelDocExpirationDate'
	) {
		return typeof raw === 'string' && raw !== '' ? formatIsoDate(raw) : String(raw)
	}
	if (key === 'daytimePhone' && typeof raw === 'string') return formatPhone(raw)
	if (key === 'aNumber' && typeof raw === 'string') return `A-${raw}`
	if (key === 'weightPounds' && typeof raw === 'string') return `${raw} lb`
	const options = optionsForEnumKey(formType, key)
	if (options) return fromOptions(options, raw)
	return typeof raw === 'string' ? raw : String(raw)
}

/** A one-sentence explanation for a group-level blocker. */
export function blockerMessage(code: GroupBlockerCode): string {
	switch (code) {
		case 'proceedings-need-explanation':
			return "You answered “yes” to a question that needs a written explanation (Part 8) this app doesn't prepare. You can finish on the official form."
		case 'category-unsupported':
			return "This eligibility category isn't one the app prepares yet — check the official Form I-765 instructions."
		case 'card-not-eligible':
			return "This card and situation can't be filed with Form I-90 in the app."
		case 'needs-preparer-parts':
			// Both forms have interpreter/preparer parts (I-765 Parts 4-5, I-90
			// Parts 6-7), so this stays form-neutral.
			return "Because an interpreter or preparer was involved, the official form needs its interpreter and preparer sections, which this app doesn't prepare."
		case 'accommodation-detail-missing':
			return 'Describe at least one accommodation you are requesting.'
		case 'travel-doc-number-missing':
			return 'Enter the passport or travel document number you used to travel to the U.S.'
	}
}
