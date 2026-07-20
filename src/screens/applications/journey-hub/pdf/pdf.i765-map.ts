import type { ApplicationKind, I765DraftAnswers } from '@convex/shared/applicationShapes'
import {
	formatUsDate,
	normalizeANumber,
	parseUnit,
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
	// Part 2 Other Information. The internal LineNN names do NOT track the
	// printed items: Line9_Checkbox is Item 10 SEX and Line10_Checkbox is
	// Item 11 MARITAL STATUS (verified per checkbox from this edition's own TU
	// tooltips + export values — an earlier audit guessed these were the SSN
	// questions, which they are not).
	sexFemale: `${P2}Line9_Checkbox[0]`, // export 'N'
	sexMale: `${P2}Line9_Checkbox[1]`, // export 'Y'
	maritalWidowed: `${P2}Line10_Checkbox[0]`,
	maritalDivorced: `${P2}Line10_Checkbox[1]`,
	maritalSingle: `${P2}Line10_Checkbox[2]`,
	maritalMarried: `${P2}Line10_Checkbox[3]`,
	// Item 12 "Have you previously filed Form I-765?" (Line19_* is Item 12).
	previouslyFiledNo: `${P2}Line19_Checkbox[0]`, // export 'N'
	previouslyFiledYes: `${P2}Line19_Checkbox[1]`, // export 'Y'
	// Part 3 statement 1.A "I can read and understand English…" (export 'A';
	// 1.B, the interpreter option, is index [0] and is never checked — an
	// interpreter/preparer filing is stopped upstream).
	statementSelfEnglish: `${P4}Pt3Line1Checkbox[1]`,
	// Items 2-3 Other Names Used — three printed rows (row 1 = Line2*, rows
	// 2-3 = Line3* indices [0]/[1]); "N/A" is written into 2.a when the
	// applicant has used no other names (instructions rule 3).
	otherName1Family: `${P1}Line2a_FamilyName[0]`,
	otherName1Given: `${P1}Line2b_GivenName[0]`,
	otherName1Middle: `${P1}Line2c_MiddleName[0]`,
	// The Line3* sibling indices are SWAPPED on this edition: [1] is printed
	// Item 3 (the second row, tooltip "3. A.", upper on the page) and [0] is
	// printed Item 4 (the third row, tooltip "4. A.", lower). Verified via TU
	// tooltips + widget y-geometry — never renumber these from the indices.
	otherName2Family: `${P1}Line3a_FamilyName[1]`,
	otherName2Given: `${P1}Line3b_GivenName[1]`,
	otherName2Middle: `${P1}Line3c_MiddleName[1]`,
	otherName3Family: `${P1}Line3a_FamilyName[0]`,
	otherName3Given: `${P1}Line3b_GivenName[0]`,
	otherName3Middle: `${P1}Line3c_MiddleName[0]`,
	// Item 6 "Is your current mailing address the same as your physical
	// address?" (export values verified: [1]='Y', [0]='N') + Item 7 U.S.
	// Physical Address. The unit boxes are STE[0]/FLR[1]/APT[2] — verified
	// per-checkbox from tooltips; 7.D is a State dropdown.
	physicalSameYes: `${P2}Part2Line5_Checkbox[1]`,
	physicalSameNo: `${P2}Part2Line5_Checkbox[0]`,
	physicalStreet: `${P2}Pt2Line7_StreetNumberName[0]`,
	physicalUnitNumber: `${P2}Pt2Line7_AptSteFlrNumber[0]`,
	physicalUnitSte: `${P2}Pt2Line7_Unit[0]`,
	physicalUnitFlr: `${P2}Pt2Line7_Unit[1]`,
	physicalUnitApt: `${P2}Pt2Line7_Unit[2]`,
	physicalCity: `${P2}Pt2Line7_CityOrTown[0]`,
	physicalState: `${P2}Pt2Line7_State[0]`,
	physicalZip: `${P2}Pt2Line7_ZipCode[0]`,
	// Items 17-26 Information About Your Last Arrival (tooltip-verified; note
	// the internal names lag the printed numbering by a few, and Item 23's
	// field is literally named place_entry).
	i94Number: `${P3}Line20a_I94Number[0]`,
	passportNumber: `${P3}Line20b_Passport[0]`,
	travelDocNumber: `${P3}Line20c_TravelDoc[0]`,
	travelDocCountry: `${P3}Line20d_CountryOfIssuance[0]`,
	travelDocExpDate: `${P3}Line20e_ExpDate[0]`,
	dateOfLastEntry: `${P3}Line21_DateOfLastEntry[0]`,
	placeOfLastEntry: `${P3}place_entry[0]`,
	statusAtLastEntry: `${P3}Line23_StatusLastEntry[0]`,
	currentStatus: `${P3}Line24_CurrentStatus[0]`,
	sevisNumber: `${P3}Line26_SEVISnumber[0]`,
	// Item 29 (c)(26) spouse's I-797 receipt; Item 30 (c)(8) arrest question
	// (export values verified: [0]='Y', [1]='N').
	c26ReceiptNumber: `${P3}Line28_ReceiptNumber[0]`,
	c8ArrestedYes: `${P3}PtLine29_YesNo[0]`,
	c8ArrestedNo: `${P3}PtLine29_YesNo[1]`,
	// Eligibility (Item 27) parenthetical boxes: letter, number — section_3
	// stays empty because no currently supported category has a sub-letter.
	eligibilityLetter: `${P3}#area[1].section_1[0]`,
	eligibilityNumber: `${P3}#area[1].section_2[0]`,
} as const

const MARITAL_FIELDS: Record<
	NonNullable<I765DraftAnswers['personFacts']['maritalStatus']>,
	string
> = {
	single: I765_FIELDS.maritalSingle,
	married: I765_FIELDS.maritalMarried,
	divorced: I765_FIELDS.maritalDivorced,
	widowed: I765_FIELDS.maritalWidowed,
}

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
	// Item 13 (SSN, "if known") is DELIBERATELY never written: the app does not
	// collect a Social Security number at all, and a blank Item 13 is a valid
	// complete filing. I765_FIELDS.ssn is kept only so a test can assert that
	// nothing ever targets it.
	pushTextOp(ops, I765_FIELDS.citizenship1, personFacts.countryOfCitizenship)
	pushTextOp(ops, I765_FIELDS.citizenship2, personFacts.secondCountryOfCitizenship)
	pushTextOp(ops, I765_FIELDS.cityOfBirth, personFacts.cityOfBirth)
	pushTextOp(ops, I765_FIELDS.stateProvinceOfBirth, personFacts.stateProvinceOfBirth)
	pushTextOp(ops, I765_FIELDS.countryOfBirth, personFacts.countryOfBirth)
	pushTextOp(ops, I765_FIELDS.dateOfBirth, formatUsDate(personFacts.dateOfBirth))
	pushTextOp(ops, I765_FIELDS.daytimePhone, personFacts.daytimePhone)
	pushTextOp(ops, I765_FIELDS.email, personFacts.email)

	// Part 2 Other Information (Items 10-12). Item 13 (SSN, "if known") is
	// deliberately left blank — the app never collects an SSN.
	if (personFacts.gender !== undefined) {
		ops.push({
			kind: 'check',
			field: personFacts.gender === 'male' ? I765_FIELDS.sexMale : I765_FIELDS.sexFemale,
		})
	}
	if (personFacts.maritalStatus !== undefined) {
		ops.push({
			kind: 'check',
			field: MARITAL_FIELDS[personFacts.maritalStatus],
		})
	}
	if (answers.form.previouslyFiledI765 !== undefined) {
		ops.push({
			kind: 'check',
			field:
				answers.form.previouslyFiledI765 === 'yes'
					? I765_FIELDS.previouslyFiledYes
					: I765_FIELDS.previouslyFiledNo,
		})
	}

	// Part 3 statement 1.A — only for a self-prepared English filing;
	// interpreter/preparer cases are stopped upstream (they need Parts 4/5).
	if (answers.form.preparedSelfInEnglish === 'yes') {
		ops.push({ kind: 'check', field: I765_FIELDS.statementSelfEnglish })
	}

	// Items 2-3 Other Names Used: rows fill top-down; "N/A" goes in 2.a when
	// the applicant answered No (instructions rule 3: type or print N/A).
	if (personFacts.hasUsedOtherNames === 'no') {
		pushTextOp(ops, I765_FIELDS.otherName1Family, 'N/A')
	} else if (personFacts.hasUsedOtherNames === 'yes') {
		const rows = personFacts.otherNames ?? []
		const rowFields = [
			[I765_FIELDS.otherName1Family, I765_FIELDS.otherName1Given, I765_FIELDS.otherName1Middle],
			[I765_FIELDS.otherName2Family, I765_FIELDS.otherName2Given, I765_FIELDS.otherName2Middle],
			[I765_FIELDS.otherName3Family, I765_FIELDS.otherName3Given, I765_FIELDS.otherName3Middle],
		] as const
		rows.slice(0, 3).forEach((row, index) => {
			pushTextOp(ops, rowFields[index]![0], row.familyName)
			pushTextOp(ops, rowFields[index]![1], row.givenName)
			pushTextOp(ops, rowFields[index]![2], row.middleName)
		})
	}

	// Items 6-7: the same-as-physical answer, and the U.S. physical address
	// only when it differs (blank Item 7 is the printed convention otherwise).
	const sameAsMailing = answers.form.physicalAddressSameAsMailing
	if (sameAsMailing !== undefined) {
		ops.push({
			kind: 'check',
			field: sameAsMailing === 'yes' ? I765_FIELDS.physicalSameYes : I765_FIELDS.physicalSameNo,
		})
	}
	const physical = answers.form.physicalAddress
	if (sameAsMailing === 'no' && physical !== undefined) {
		pushTextOp(ops, I765_FIELDS.physicalStreet, physical.street)
		if (physical.unit !== undefined && physical.unit.trim() !== '') {
			const { unitType, unitNumber } = parseUnit(physical.unit)
			if (unitType === 'apt') ops.push({ kind: 'check', field: I765_FIELDS.physicalUnitApt })
			if (unitType === 'ste') ops.push({ kind: 'check', field: I765_FIELDS.physicalUnitSte })
			if (unitType === 'flr') ops.push({ kind: 'check', field: I765_FIELDS.physicalUnitFlr })
			pushTextOp(ops, I765_FIELDS.physicalUnitNumber, unitNumber)
		}
		pushTextOp(ops, I765_FIELDS.physicalCity, physical.city)
		if (physical.state !== undefined && physical.state.trim() !== '') {
			ops.push({
				kind: 'select',
				field: I765_FIELDS.physicalState,
				value: physical.state.trim().toUpperCase(),
			})
		}
		pushTextOp(ops, I765_FIELDS.physicalZip, physical.zipCode)
	}

	// Items 17-26 last arrival. The passport/travel-document group is emitted
	// only when one was used to travel (its ops are absent otherwise, matching
	// the instructions' conditional).
	pushTextOp(ops, I765_FIELDS.i94Number, personFacts.i94Number)
	if (personFacts.usedTravelDocument === 'yes') {
		pushTextOp(ops, I765_FIELDS.passportNumber, personFacts.passportNumber)
		pushTextOp(ops, I765_FIELDS.travelDocNumber, personFacts.travelDocNumber)
		pushTextOp(ops, I765_FIELDS.travelDocCountry, personFacts.travelDocCountryOfIssuance)
		pushTextOp(ops, I765_FIELDS.travelDocExpDate, formatUsDate(personFacts.travelDocExpirationDate))
	}
	pushTextOp(ops, I765_FIELDS.dateOfLastEntry, formatUsDate(personFacts.dateOfLastEntry))
	pushTextOp(ops, I765_FIELDS.placeOfLastEntry, personFacts.placeOfLastEntry)
	pushTextOp(ops, I765_FIELDS.statusAtLastEntry, personFacts.statusAtLastEntry)
	pushTextOp(ops, I765_FIELDS.currentStatus, personFacts.currentImmigrationStatus)
	pushTextOp(ops, I765_FIELDS.sevisNumber, personFacts.sevisNumber)

	// Category-specific items (29-30), emitted only for their categories.
	if (personFacts.eligibilityCategory === 'C26') {
		pushTextOp(ops, I765_FIELDS.c26ReceiptNumber, answers.form.c26SpouseReceiptNumber)
	}
	if (personFacts.eligibilityCategory === 'C08') {
		const arrested = answers.form.c8EverArrestedOrConvicted
		if (arrested === 'yes' || arrested === 'no') {
			ops.push({
				kind: 'check',
				field: arrested === 'yes' ? I765_FIELDS.c8ArrestedYes : I765_FIELDS.c8ArrestedNo,
			})
		}
	}

	if (personFacts.eligibilityCategory !== undefined) {
		const split = splitEligibilityCategory(personFacts.eligibilityCategory)
		if (split !== null) {
			pushTextOp(ops, I765_FIELDS.eligibilityLetter, split[0])
			pushTextOp(ops, I765_FIELDS.eligibilityNumber, split[1])
		}
	}

	return ops
}
