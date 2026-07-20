import { ANumberStep } from './steps.a-number'
import { ApplicantStatementStep } from './steps.applicant-statement'
import { CardDetailsStep } from './steps.card-details'
import { CitizenshipStep } from './steps.citizenship'
import { ImmigrationHistoryStep } from './steps.immigration-history'
import { ContactInfoStep } from './steps.contact-info'
import { CountryOfBirthStep } from './steps.country-of-birth'
import { DateOfBirthStep } from './steps.date-of-birth'
import { EligibilityCategoryStep } from './steps.eligibility-category'
import { LegalNameStep } from './steps.legal-name'
import { MailingAddressStep } from './steps.mailing-address'
import { PersonalDetailsStep } from './steps.personal-details'
import { PhysicalDescriptionStep } from './steps.physical-description'

/**
 * Step bodies joined to the step metadata (interview.form.ts) by key. Every
 * pre-Review blueprint key must have a body — asserted by the interview.form
 * unit tests via this record's keys.
 */
export const stepBodies = {
	'legal-name': LegalNameStep,
	'date-of-birth': DateOfBirthStep,
	'country-of-birth': CountryOfBirthStep,
	citizenship: CitizenshipStep,
	'personal-details': PersonalDetailsStep,
	'immigration-history': ImmigrationHistoryStep,
	'a-number': ANumberStep,
	'mailing-address': MailingAddressStep,
	'contact-info': ContactInfoStep,
	'physical-description': PhysicalDescriptionStep,
	'eligibility-category': EligibilityCategoryStep,
	'card-details': CardDetailsStep,
	'applicant-statement': ApplicantStatementStep,
} as const

export type StepBodyKey = keyof typeof stepBodies
