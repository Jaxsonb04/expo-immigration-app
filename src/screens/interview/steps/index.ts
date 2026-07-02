import { ANumberStep } from './steps.a-number'
import { CardDetailsStep } from './steps.card-details'
import { CountryOfBirthStep } from './steps.country-of-birth'
import { DateOfBirthStep } from './steps.date-of-birth'
import { EligibilityCategoryStep } from './steps.eligibility-category'
import { LegalNameStep } from './steps.legal-name'
import { MailingAddressStep } from './steps.mailing-address'

/**
 * Step bodies joined to the step metadata (interview.form.ts) by key. Every
 * pre-Review blueprint key must have a body — asserted by the interview.form
 * unit tests via this record's keys.
 */
export const stepBodies = {
	'legal-name': LegalNameStep,
	'date-of-birth': DateOfBirthStep,
	'country-of-birth': CountryOfBirthStep,
	'a-number': ANumberStep,
	'mailing-address': MailingAddressStep,
	'eligibility-category': EligibilityCategoryStep,
	'card-details': CardDetailsStep,
} as const

export type StepBodyKey = keyof typeof stepBodies
