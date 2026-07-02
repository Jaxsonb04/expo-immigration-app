import type { I90DraftAnswers } from '@convex/shared/applicationShapes'
import { formatUsDate, normalizeANumber, pushAddressOps, pushTextOp, type FillOp } from './pdf.fill'

// Fully-qualified AcroForm paths verified against the bundled 2025-02-27
// edition (assets/forms/i-90.pdf).

const S0 = 'form1[0].#subform[0].'
const S1 = 'form1[0].#subform[1].'

export const I90_FIELDS = {
	familyName: `${S0}P1_Line3a_FamilyName[0]`,
	givenName: `${S0}P1_Line3b_GivenName[0]`,
	middleName: `${S0}P1_Line3c_MiddleName[0]`,
	aNumber: `${S0}#area[1].P1_Line1_AlienNumber[0]`,
	mailingStreet: `${S0}P1_Line6b_StreetNumberName[0]`,
	mailingUnitNumber: `${S0}P1_Line6c_AptSteFlrNumber[0]`,
	// Unit-type boxes verified by widget x-geometry (x=343/385/427 left→right):
	// plain APT/STE/FLR order — DIFFERENT from the I-765's shuffled indices.
	mailingUnitApt: `${S0}P1_checkbox6c_Unit[0]`,
	mailingUnitSte: `${S0}P1_checkbox6c_Unit[1]`,
	mailingUnitFlr: `${S0}P1_checkbox6c_Unit[2]`,
	mailingCity: `${S0}P1_Line6d_CityOrTown[0]`,
	mailingState: `${S0}P1_Line6e_State[0]`,
	mailingZip: `${S0}P1_Line6f_ZipCode[0]`,
	dateOfBirth: `${S1}P1_Line9_DateOfBirth[0]`,
	// Note the lowercase 'of' — this edition really names it CountryofBirth.
	countryOfBirth: `${S1}P1_Line11_CountryofBirth[0]`,
} as const

/**
 * Build the fill ops for an I-90 draft. form.cardExpirationDate and
 * form.replacementReason are deliberately unmapped: the Part 2 reason
 * checkboxes (P2_checkbox2[0..n]) cannot be safely ordered without visual
 * verification, and no expiration-date field exists on this edition.
 */
export function buildI90Ops(answers: I90DraftAnswers): FillOp[] {
	const ops: FillOp[] = []
	const personFacts = answers.personFacts

	pushTextOp(ops, I90_FIELDS.familyName, personFacts.familyName)
	pushTextOp(ops, I90_FIELDS.givenName, personFacts.givenName)
	pushTextOp(ops, I90_FIELDS.middleName, personFacts.middleName)
	pushTextOp(ops, I90_FIELDS.aNumber, normalizeANumber(personFacts.aNumber))

	pushAddressOps(ops, personFacts.mailingAddress, {
		street: I90_FIELDS.mailingStreet,
		unitNumber: I90_FIELDS.mailingUnitNumber,
		unitType: {
			apt: I90_FIELDS.mailingUnitApt,
			ste: I90_FIELDS.mailingUnitSte,
			flr: I90_FIELDS.mailingUnitFlr,
		},
		city: I90_FIELDS.mailingCity,
		state: I90_FIELDS.mailingState,
		zip: I90_FIELDS.mailingZip,
	})

	pushTextOp(ops, I90_FIELDS.dateOfBirth, formatUsDate(personFacts.dateOfBirth))
	pushTextOp(ops, I90_FIELDS.countryOfBirth, personFacts.countryOfBirth)

	return ops
}
