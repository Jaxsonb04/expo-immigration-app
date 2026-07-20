import type { ApplicationKind, I765DraftAnswers } from '@convex/shared/applicationShapes'
import {
	formatUsDate,
	normalizeANumber,
	pushAddressOps,
	pushTextOp,
	splitEligibilityCategory,
	type FillOp,
} from './pdf.fill'

// Fully-qualified AcroForm paths verified against the bundled 2025-08-26
// edition (assets/forms/i-765.pdf). The internal LineNN names do NOT match
// the printed item numbers — e.g. printed Item 16 "Date of Birth" is
// Line19_DOB, and Line17a/17b_CountryOfBirth are really the citizenship
// items — so never "correct" these paths from the printed form.

const P1 = 'form1[0].Page1[0].'
const P2 = 'form1[0].Page2[0].'
const P3 = 'form1[0].Page3[0].'
const P4 = 'form1[0].Page4[0].'

export const I765_FIELDS = {
	familyName: `${P1}Line1a_FamilyName[0]`,
	givenName: `${P1}Line1b_GivenName[0]`,
	middleName: `${P1}Line1c_MiddleName[0]`,
	// Part 1 reason boxes, verified by widget y-geometry (top→bottom).
	reasonInitial: `${P1}Part1_Checkbox[0]`,
	reasonReplacement: `${P1}Part1_Checkbox[1]`,
	reasonRenewal: `${P1}Part1_Checkbox[2]`,
	// Mailing address (Item 5) — the naming is split across two prefixes on
	// this edition: street is Line4b_*, the rest are Pt2Line5_*.
	mailingStreet: `${P2}Line4b_StreetNumberName[0]`,
	mailingUnitNumber: `${P2}Pt2Line5_AptSteFlrNumber[0]`,
	// Unit-type boxes verified by widget x-geometry (x=60/102/144 prints
	// APT/STE/FLR left→right): the indices do NOT follow visual order —
	// APT really is [2].
	mailingUnitApt: `${P2}Pt2Line5_Unit[2]`,
	mailingUnitSte: `${P2}Pt2Line5_Unit[0]`,
	mailingUnitFlr: `${P2}Pt2Line5_Unit[1]`,
	mailingCity: `${P2}Pt2Line5_CityOrTown[0]`,
	mailingState: `${P2}Pt2Line5_State[0]`,
	mailingZip: `${P2}Pt2Line5_ZipCode[0]`,
	aNumber: `${P2}Line7_AlienNumber[0]`,
	ssn: `${P2}Line12b_SSN[0]`,
	// Item 14 citizenship — the Line17* names say "CountryOfBirth" but their TU
	// tooltips read "Your Country or Countries of Citizenship or Nationality";
	// 17a sits above 17b (y=396 vs 360), so 17a is the first citizenship line.
	citizenship1: `${P2}Line17a_CountryOfBirth[0]`,
	citizenship2: `${P2}Line17b_CountryOfBirth[0]`,
	// Item 15 place of birth: 15.A city/town/village, 15.B state/province
	// (tooltip-verified — both are named Line18a/b_CityTownOfBirth), 15.C country.
	cityOfBirth: `${P3}Line18a_CityTownOfBirth[0]`,
	stateProvinceOfBirth: `${P3}Line18b_CityTownOfBirth[0]`,
	countryOfBirth: `${P3}Line18c_CountryOfBirth[0]`,
	dateOfBirth: `${P3}Line19_DOB[0]`,
	// Part 3 applicant contact block (tooltip-verified; phone is a 10-digit comb).
	daytimePhone: `${P4}Pt3Line3_DaytimePhoneNumber1[0]`,
	email: `${P4}Pt3Line5_Email[0]`,
	// Eligibility (Item 27) parenthetical boxes: letter, number — section_3
	// stays empty because no currently supported category has a sub-letter.
	eligibilityLetter: `${P3}#area[1].section_1[0]`,
	eligibilityNumber: `${P3}#area[1].section_2[0]`,
} as const

const REASON_FIELDS: Record<ApplicationKind, string> = {
	initial: I765_FIELDS.reasonInitial,
	replacement: I765_FIELDS.reasonReplacement,
	renewal: I765_FIELDS.reasonRenewal,
}

/**
 * Build the fill ops for an I-765 draft. Empty answers emit no ops;
 * form.previousEadCardNumber and form.replacementReason are deliberately
 * unmapped — this edition's AcroForm has no corresponding fields for them.
 */
export function buildI765Ops(
	answers: I765DraftAnswers,
	applicationKind: ApplicationKind,
): FillOp[] {
	const ops: FillOp[] = []
	const personFacts = answers.personFacts

	ops.push({ kind: 'check', field: REASON_FIELDS[applicationKind] })

	pushTextOp(ops, I765_FIELDS.familyName, personFacts.familyName)
	pushTextOp(ops, I765_FIELDS.givenName, personFacts.givenName)
	pushTextOp(ops, I765_FIELDS.middleName, personFacts.middleName)

	pushAddressOps(ops, personFacts.mailingAddress, {
		street: I765_FIELDS.mailingStreet,
		unitNumber: I765_FIELDS.mailingUnitNumber,
		unitType: {
			apt: I765_FIELDS.mailingUnitApt,
			ste: I765_FIELDS.mailingUnitSte,
			flr: I765_FIELDS.mailingUnitFlr,
		},
		city: I765_FIELDS.mailingCity,
		state: I765_FIELDS.mailingState,
		zip: I765_FIELDS.mailingZip,
	})

	pushTextOp(ops, I765_FIELDS.aNumber, normalizeANumber(personFacts.aNumber))
	pushTextOp(ops, I765_FIELDS.ssn, answers.form.ssn?.replace(/\D/g, ''))
	pushTextOp(ops, I765_FIELDS.citizenship1, personFacts.countryOfCitizenship)
	pushTextOp(ops, I765_FIELDS.citizenship2, personFacts.secondCountryOfCitizenship)
	pushTextOp(ops, I765_FIELDS.cityOfBirth, personFacts.cityOfBirth)
	pushTextOp(ops, I765_FIELDS.stateProvinceOfBirth, personFacts.stateProvinceOfBirth)
	pushTextOp(ops, I765_FIELDS.countryOfBirth, personFacts.countryOfBirth)
	pushTextOp(ops, I765_FIELDS.dateOfBirth, formatUsDate(personFacts.dateOfBirth))
	pushTextOp(ops, I765_FIELDS.daytimePhone, personFacts.daytimePhone)
	pushTextOp(ops, I765_FIELDS.email, personFacts.email)

	if (personFacts.eligibilityCategory !== undefined) {
		const split = splitEligibilityCategory(personFacts.eligibilityCategory)
		if (split !== null) {
			pushTextOp(ops, I765_FIELDS.eligibilityLetter, split[0])
			pushTextOp(ops, I765_FIELDS.eligibilityNumber, split[1])
		}
	}

	return ops
}
