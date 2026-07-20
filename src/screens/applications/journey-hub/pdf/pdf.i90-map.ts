import type {
	ApplicationKind,
	EyeColor,
	Gender,
	HairColor,
	I90DraftAnswers,
	Race,
} from '@convex/shared/applicationShapes'
import {
	formatUsDate,
	normalizeANumber,
	parseUnit,
	pushAddressOps,
	pushTextOp,
	type FillOp,
} from './pdf.fill'

// Fully-qualified AcroForm paths verified against the bundled 2025-02-27
// edition (assets/forms/i-90.pdf).

const S0 = 'form1[0].#subform[0].'
const S1 = 'form1[0].#subform[1].'
const S2 = 'form1[0].#subform[2].'
const S3 = 'form1[0].#subform[3].'

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
	// Item 10 city/town/village of birth (tooltip-verified explicit name).
	cityOfBirth: `${S1}P1_Line10_CityTownOfBirth[0]`,
	// Note the lowercase 'of' — this edition really names it CountryofBirth.
	countryOfBirth: `${S1}P1_Line11_CountryofBirth[0]`,
	// Part 5 applicant contact block (tooltip-verified).
	daytimePhone: `${S3}P5_Line3_DaytimePhoneNumber[0]`,
	email: `${S3}P5_Line5_EmailAddress[0]`,
	// Part 1 Item 8 "Sex" — two independent checkboxes (tooltip-verified).
	genderMale: `${S1}P1_Line8_male[0]`,
	genderFemale: `${S1}P1_Line8_female[0]`,
	// Part 1 Items 12-15 (tooltip-verified explicit names).
	motherGivenName: `${S1}P1_Line12_MotherGivenName[0]`,
	fatherGivenName: `${S1}P1_Line13_FatherGivenName[0]`,
	classOfAdmission: `${S1}P1_Line14_ClassOfAdmission[0]`,
	dateOfAdmission: `${S1}P1_Line15_DateOfAdmission[0]`,
	// Part 3 Item 8 height — dropdowns whose options are '2'-'8' / '0'-'11'.
	heightFeet: `${S2}P3_Line8_HeightFeet[0]`,
	heightInches: `${S2}P3_Line8_HeightInches[0]`,
	// Part 3 Item 9 weight — three 1-digit combs MISNAMED HeightInches1/2/3;
	// their tooltips read "Enter First/Second/Third Digit of Weight in Pounds".
	weightDigit1: `${S2}P3_Line9_HeightInches1[0]`,
	weightDigit2: `${S2}P3_Line9_HeightInches2[0]`,
	weightDigit3: `${S2}P3_Line9_HeightInches3[0]`,
	// Part 3 Item 6 ethnicity (checkbox6[1]='H' Hispanic, [0]='N' Not).
	ethnicityHispanic: `${S2}P3_checkbox6[1]`,
	ethnicityNotHispanic: `${S2}P3_checkbox6[0]`,
	// Part 3 Item 7 race (select all that apply; self-describing names).
	raceAmericanIndian: `${S2}P3_checkbox7_Indian[0]`,
	raceAsian: `${S2}P3_checkbox7_Asian[0]`,
	raceBlack: `${S2}P3_checkbox7_Black[0]`,
	raceHawaiian: `${S2}P3_checkbox7_Hawaiian[0]`,
	raceWhite: `${S2}P3_checkbox7_White[0]`,
	// Part 3 Items 10/11 eye and hair color — indices verified per checkbox
	// against export values (BLU/GRN/HAZ/PNK/MAR/BRO/BLK/UNK/GRY and
	// BAL/BLN/GRY/SDY/UNK/WHI/RED/BRO/BLK); they do NOT follow a printed order.
	eyeBlack: `${S2}P3_checkbox10[6]`,
	eyeBlue: `${S2}P3_checkbox10[0]`,
	eyeBrown: `${S2}P3_checkbox10[5]`,
	eyeGray: `${S2}P3_checkbox10[8]`,
	eyeGreen: `${S2}P3_checkbox10[1]`,
	eyeHazel: `${S2}P3_checkbox10[2]`,
	eyeMaroon: `${S2}P3_checkbox10[4]`,
	eyePink: `${S2}P3_checkbox10[3]`,
	eyeUnknown: `${S2}P3_checkbox10[7]`,
	hairBald: `${S2}P3_checkbox11[0]`,
	hairBlack: `${S2}P3_checkbox11[8]`,
	hairBlond: `${S2}P3_checkbox11[1]`,
	hairBrown: `${S2}P3_checkbox11[7]`,
	hairGray: `${S2}P3_checkbox11[2]`,
	hairRed: `${S2}P3_checkbox11[6]`,
	hairSandy: `${S2}P3_checkbox11[3]`,
	hairWhite: `${S2}P3_checkbox11[5]`,
	hairUnknown: `${S2}P3_checkbox11[4]`,
	// Part 1 Item 4 (Y/N/NA — export values verified) + Items 5.A-5.C (the
	// name as printed on the current card, required only on Yes).
	nameChangedYes: `${S0}P1_checkbox4[0]`,
	nameChangedNo: `${S0}P1_checkbox4[1]`,
	nameChangedNa: `${S0}P1_checkbox4[2]`,
	previousFamilyName: `${S0}P1_Line5a_FamilyName[0]`,
	previousGivenName: `${S0}P1_Line5b_GivenName[0]`,
	previousMiddleName: `${S0}P1_Line5c_MiddleName[0]`,
	// Part 1 Item 7 physical address ("only if different than mailing") —
	// unit boxes in plain APT/STE/FLR order; 7.D is a State dropdown; 7.F-7.H
	// are the foreign province/postal/country boxes.
	physicalStreet: `${S0}P1_Line7a_StreetNumberName[0]`,
	physicalUnitNumber: `${S0}P1_Line7b_AptSteFlrNumber[0]`,
	physicalUnitApt: `${S0}P1_checkbox7b_Unit[0]`,
	physicalUnitSte: `${S0}P1_checkbox7b_Unit[1]`,
	physicalUnitFlr: `${S0}P1_checkbox7b_Unit[2]`,
	physicalCity: `${S0}P1_Line7c_CityOrTown[0]`,
	physicalState: `${S0}P1_Line7d_State[0]`,
	physicalZip: `${S0}P1_Line7e_ZipCode[0]`,
	physicalProvince: `${S0}P1_Line7f_Province[0]`,
	physicalPostalCode: `${S0}P1_Line7g_PostalCode[0]`,
	physicalCountry: `${S0}P1_Line7h_Country[0]`,
	// Part 3 Items 1-5 (processing information; tooltips verified).
	locationAppliedVisa: `${S2}P3_Line1_LocationAppliedVisa[0]`,
	locationIssuedVisa: `${S2}P3_Line2_LocationIssuedVisa[0]`,
	destinationAtAdmission: `${S2}P3_Line3a_Destination[0]`,
	portOfEntryCityState: `${S2}P3_Line3a1_CityandState[0]`,
	proceedingsYes: `${S2}P3_checkbox4[1]`,
	proceedingsNo: `${S2}P3_checkbox4[0]`,
	i407Yes: `${S2}P3_checkbox5[1]`,
	i407No: `${S2}P3_checkbox5[0]`,
	// Part 4 accommodations (Item 1 Y/N on page 3; the 1.A language box is on
	// page 3, the 1.B/1.C boxes and texts on page 4) + Part 5 statement 1.A
	// (note the capital C in P5_Checkbox1a on this edition).
	accommodationYes: `${S2}P4_checkbox1[1]`,
	accommodationNo: `${S2}P4_checkbox1[0]`,
	accommodationDeafBox: `${S2}P4_checkbox1a[0]`,
	accommodationDeafText: `${S2}P4_Line1a_AccomodationRequested[0]`,
	accommodationBlindBox: `${S3}P4_checkbox1b[0]`,
	accommodationBlindText: `${S3}P4_Line1b_AccomodationRequested[0]`,
	accommodationOtherBox: `${S3}P4_checkbox1c[0]`,
	accommodationOtherText: `${S3}P4_Line1c_AccomodationRequested[0]`,
	statementSelfEnglish: `${S3}P5_Checkbox1a[0]`,
	// Part 2 Item 1 "My status is", verified per checkbox against this
	// edition's TU tooltips AND export values ('1a'/'1b'/'1c') AND widget
	// y-geometry (211/193/163 top→bottom). Indices DO follow printed order
	// here — unlike the Item 2 family below.
	statusPermanentResident: `${S1}P2_checkbox1[0]`, // 1.a
	statusCommuter: `${S1}P2_checkbox1[1]`, // 1.b
	statusConditionalResident: `${S1}P2_checkbox1[2]`, // 1.c
	// Part 2 Item 2 "Reason for Application" (Section A) boxes, verified per
	// checkbox against this edition's own TU tooltips (which carry the printed
	// item text) plus widget y-geometry AND the checkbox export values
	// ('2a'/'2c'/'2d'/'2e'/'2f'). The indices do NOT follow the printed
	// 2.a–2.j order — e.g. 2.a is [5] and 2.e is [0] — so never renumber
	// these from the printed form.
	reasonLostStolenDestroyed: `${S1}P2_checkbox2[5]`, // 2.a
	reasonMutilated: `${S1}P2_checkbox2[7]`, // 2.c
	reasonDhsError: `${S1}P2_checkbox2[4]`, // 2.d
	reasonNameChanged: `${S1}P2_checkbox2[0]`, // 2.e
	reasonExpiring: `${S1}P2_checkbox2[1]`, // 2.f
	// Part 2 Item 3 "Reason for Application" Section B — used ONLY by a
	// conditional permanent resident (its tooltips say so explicitly).
	// Verified per checkbox against TU tooltips + export values ('3a'-'3e') +
	// y-geometry. Note the shuffled indices: 3.a is [4], not [0]. Section B
	// has no expiring-card reason — a conditional resident cannot renew via
	// I-90 (shared/screening.ts blocks that combination).
	reasonCrLostStolenDestroyed: `${S2}P2_checkbox3[4]`, // 3.a
	reasonCrMutilated: `${S2}P2_checkbox3[1]`, // 3.c
	reasonCrDhsError: `${S2}P2_checkbox3[2]`, // 3.d
	reasonCrNameChanged: `${S2}P2_checkbox3[3]`, // 3.e
} as const

const STATUS_FIELDS: Record<NonNullable<I90DraftAnswers['form']['cardStatus']>, string> = {
	permanentResident: I90_FIELDS.statusPermanentResident,
	commuter: I90_FIELDS.statusCommuter,
	conditionalResident: I90_FIELDS.statusConditionalResident,
}

const GENDER_FIELDS: Record<Gender, string> = {
	male: I90_FIELDS.genderMale,
	female: I90_FIELDS.genderFemale,
}

const EYE_COLOR_FIELDS: Record<EyeColor, string> = {
	black: I90_FIELDS.eyeBlack,
	blue: I90_FIELDS.eyeBlue,
	brown: I90_FIELDS.eyeBrown,
	gray: I90_FIELDS.eyeGray,
	green: I90_FIELDS.eyeGreen,
	hazel: I90_FIELDS.eyeHazel,
	maroon: I90_FIELDS.eyeMaroon,
	pink: I90_FIELDS.eyePink,
	unknownOrOther: I90_FIELDS.eyeUnknown,
}

const HAIR_COLOR_FIELDS: Record<HairColor, string> = {
	bald: I90_FIELDS.hairBald,
	black: I90_FIELDS.hairBlack,
	blond: I90_FIELDS.hairBlond,
	brown: I90_FIELDS.hairBrown,
	gray: I90_FIELDS.hairGray,
	red: I90_FIELDS.hairRed,
	sandy: I90_FIELDS.hairSandy,
	white: I90_FIELDS.hairWhite,
	unknownOrOther: I90_FIELDS.hairUnknown,
}

const NAME_CHANGE_FIELDS: Record<
	NonNullable<I90DraftAnswers['form']['nameChangedSinceIssuance']>,
	string
> = {
	yes: I90_FIELDS.nameChangedYes,
	no: I90_FIELDS.nameChangedNo,
	neverReceivedCard: I90_FIELDS.nameChangedNa,
}

const RACE_FIELDS: Record<Race, string> = {
	americanIndianOrAlaskaNative: I90_FIELDS.raceAmericanIndian,
	asian: I90_FIELDS.raceAsian,
	blackOrAfricanAmerican: I90_FIELDS.raceBlack,
	nativeHawaiianOrOtherPacificIslander: I90_FIELDS.raceHawaiian,
	white: I90_FIELDS.raceWhite,
}

// Reason destination per collected replacement reason, one map per printed
// section: Section A (Item 2) for a lawful permanent resident or commuter,
// Section B (Item 3) for a conditional resident. 'lost' and 'stolen' share
// the "lost, stolen, or destroyed" box; 'damaged' is the printed "mutilated";
// 'error' is the DHS data-error box.
type ReplacementReason = NonNullable<I90DraftAnswers['form']['replacementReason']>

const SECTION_A_REASON_FIELDS: Record<ReplacementReason, string> = {
	lost: I90_FIELDS.reasonLostStolenDestroyed,
	stolen: I90_FIELDS.reasonLostStolenDestroyed,
	damaged: I90_FIELDS.reasonMutilated,
	error: I90_FIELDS.reasonDhsError,
	nameChange: I90_FIELDS.reasonNameChanged,
}

const SECTION_B_REASON_FIELDS: Record<ReplacementReason, string> = {
	lost: I90_FIELDS.reasonCrLostStolenDestroyed,
	stolen: I90_FIELDS.reasonCrLostStolenDestroyed,
	damaged: I90_FIELDS.reasonCrMutilated,
	error: I90_FIELDS.reasonCrDhsError,
	nameChange: I90_FIELDS.reasonCrNameChanged,
}

/**
 * Build the fill ops for an I-90 draft. form.cardExpirationDate stays
 * unmapped — no expiration-date field exists on this edition.
 */
export function buildI90Ops(answers: I90DraftAnswers, applicationKind: ApplicationKind): FillOp[] {
	const ops: FillOp[] = []
	const personFacts = answers.personFacts
	const cardStatus = answers.form.cardStatus

	// Part 2 Item 1 "My status is": emitted only when actually collected — a
	// legacy draft without a status emits nothing (and readiness blocks it)
	// rather than guessing 1.a.
	if (cardStatus !== undefined) {
		ops.push({ kind: 'check', field: STATUS_FIELDS[cardStatus] })
	}

	// Reason: a renewal is Section A's expiring-card box (2.f) — the
	// conditional-resident + renewal combination is blocked upstream
	// (shared/screening.ts) and Section B has no expiring reason, so if a
	// self-contradictory draft ever reaches a render through a non-UI write
	// path, emit NO reason box rather than a Section A box the applicant's
	// status forbids. A replacement follows the collected reason in the
	// section the status dictates; a draft that has not yet answered the
	// reason step emits nothing rather than guessing.
	if (applicationKind === 'renewal') {
		if (cardStatus !== 'conditionalResident') {
			ops.push({ kind: 'check', field: I90_FIELDS.reasonExpiring })
		}
	} else if (applicationKind === 'replacement' && answers.form.replacementReason !== undefined) {
		const reasonFields =
			cardStatus === 'conditionalResident' ? SECTION_B_REASON_FIELDS : SECTION_A_REASON_FIELDS
		ops.push({ kind: 'check', field: reasonFields[answers.form.replacementReason] })
	}

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
	pushTextOp(ops, I90_FIELDS.cityOfBirth, personFacts.cityOfBirth)
	pushTextOp(ops, I90_FIELDS.countryOfBirth, personFacts.countryOfBirth)
	pushTextOp(ops, I90_FIELDS.daytimePhone, personFacts.daytimePhone)
	pushTextOp(ops, I90_FIELDS.email, personFacts.email)

	// Part 1 Additional Information (slice 3b).
	if (personFacts.gender !== undefined) {
		ops.push({ kind: 'check', field: GENDER_FIELDS[personFacts.gender] })
	}
	pushTextOp(ops, I90_FIELDS.motherGivenName, personFacts.motherGivenName)
	pushTextOp(ops, I90_FIELDS.fatherGivenName, personFacts.fatherGivenName)
	pushTextOp(ops, I90_FIELDS.classOfAdmission, personFacts.classOfAdmission)
	pushTextOp(ops, I90_FIELDS.dateOfAdmission, formatUsDate(personFacts.dateOfAdmission))

	// Part 3 Biographic Information: height is a pair of dropdowns; weight is
	// three 1-digit combs, so pad to 3 digits ('85' prints 0|8|5).
	if (personFacts.heightFeet !== undefined) {
		ops.push({ kind: 'select', field: I90_FIELDS.heightFeet, value: personFacts.heightFeet })
	}
	if (personFacts.heightInches !== undefined) {
		ops.push({ kind: 'select', field: I90_FIELDS.heightInches, value: personFacts.heightInches })
	}
	if (personFacts.weightPounds !== undefined) {
		const digits = personFacts.weightPounds.padStart(3, '0')
		pushTextOp(ops, I90_FIELDS.weightDigit1, digits[0])
		pushTextOp(ops, I90_FIELDS.weightDigit2, digits[1])
		pushTextOp(ops, I90_FIELDS.weightDigit3, digits[2])
	}
	if (personFacts.ethnicity !== undefined) {
		ops.push({
			kind: 'check',
			field:
				personFacts.ethnicity === 'hispanicOrLatino'
					? I90_FIELDS.ethnicityHispanic
					: I90_FIELDS.ethnicityNotHispanic,
		})
	}
	for (const race of personFacts.races ?? []) {
		ops.push({ kind: 'check', field: RACE_FIELDS[race] })
	}
	if (personFacts.eyeColor !== undefined) {
		ops.push({ kind: 'check', field: EYE_COLOR_FIELDS[personFacts.eyeColor] })
	}
	if (personFacts.hairColor !== undefined) {
		ops.push({ kind: 'check', field: HAIR_COLOR_FIELDS[personFacts.hairColor] })
	}

	// Part 1 Item 4 + Items 5.A-5.C (slice 3c).
	const nameChanged = answers.form.nameChangedSinceIssuance
	if (nameChanged !== undefined) {
		ops.push({ kind: 'check', field: NAME_CHANGE_FIELDS[nameChanged] })
		if (nameChanged === 'yes') {
			pushTextOp(ops, I90_FIELDS.previousFamilyName, answers.form.previousFamilyName)
			pushTextOp(ops, I90_FIELDS.previousGivenName, answers.form.previousGivenName)
			pushTextOp(ops, I90_FIELDS.previousMiddleName, answers.form.previousMiddleName)
		}
	}

	// Part 1 Item 7: emitted only when the physical address differs — a blank
	// Item 7 is the printed form's own "same as mailing" convention.
	const physical = answers.form.physicalAddress
	if (answers.form.physicalAddressSameAsMailing === 'no' && physical !== undefined) {
		pushTextOp(ops, I90_FIELDS.physicalStreet, physical.street)
		if (physical.unit !== undefined && physical.unit.trim() !== '') {
			const { unitType, unitNumber } = parseUnit(physical.unit)
			if (unitType === 'apt') ops.push({ kind: 'check', field: I90_FIELDS.physicalUnitApt })
			if (unitType === 'ste') ops.push({ kind: 'check', field: I90_FIELDS.physicalUnitSte })
			if (unitType === 'flr') ops.push({ kind: 'check', field: I90_FIELDS.physicalUnitFlr })
			pushTextOp(ops, I90_FIELDS.physicalUnitNumber, unitNumber)
		}
		pushTextOp(ops, I90_FIELDS.physicalCity, physical.city)
		if (physical.state !== undefined && physical.state.trim() !== '') {
			ops.push({
				kind: 'select',
				field: I90_FIELDS.physicalState,
				value: physical.state.trim().toUpperCase(),
			})
		}
		pushTextOp(ops, I90_FIELDS.physicalZip, physical.zipCode)
		pushTextOp(ops, I90_FIELDS.physicalProvince, physical.province)
		pushTextOp(ops, I90_FIELDS.physicalPostalCode, physical.postalCode)
		pushTextOp(ops, I90_FIELDS.physicalCountry, physical.country)
	}

	// Part 3 Items 1-5.
	pushTextOp(ops, I90_FIELDS.locationAppliedVisa, personFacts.locationAppliedVisa)
	pushTextOp(ops, I90_FIELDS.locationIssuedVisa, personFacts.locationIssuedVisa)
	if (personFacts.becameResidentVia === 'immigrantVisa') {
		pushTextOp(ops, I90_FIELDS.destinationAtAdmission, personFacts.destinationAtAdmission)
		pushTextOp(ops, I90_FIELDS.portOfEntryCityState, personFacts.portOfEntryCityState)
	}
	if (personFacts.everInProceedings !== undefined) {
		ops.push({
			kind: 'check',
			field:
				personFacts.everInProceedings === 'yes'
					? I90_FIELDS.proceedingsYes
					: I90_FIELDS.proceedingsNo,
		})
	}
	if (personFacts.filedI407OrAbandoned !== undefined) {
		ops.push({
			kind: 'check',
			field: personFacts.filedI407OrAbandoned === 'yes' ? I90_FIELDS.i407Yes : I90_FIELDS.i407No,
		})
	}

	// Part 4 accommodations: the printed form has an explicit No box; each
	// selected accommodation checks its box and carries its detail text.
	const requesting = answers.form.requestingAccommodation
	if (requesting === 'no') {
		ops.push({ kind: 'check', field: I90_FIELDS.accommodationNo })
	} else if (requesting === 'yes') {
		ops.push({ kind: 'check', field: I90_FIELDS.accommodationYes })
		const deaf = answers.form.accommodationDeafSignLanguage
		if (deaf !== undefined && deaf.trim() !== '') {
			ops.push({ kind: 'check', field: I90_FIELDS.accommodationDeafBox })
			pushTextOp(ops, I90_FIELDS.accommodationDeafText, deaf)
		}
		const blind = answers.form.accommodationBlindDetail
		if (blind !== undefined && blind.trim() !== '') {
			ops.push({ kind: 'check', field: I90_FIELDS.accommodationBlindBox })
			pushTextOp(ops, I90_FIELDS.accommodationBlindText, blind)
		}
		const other = answers.form.accommodationOtherDetail
		if (other !== undefined && other.trim() !== '') {
			ops.push({ kind: 'check', field: I90_FIELDS.accommodationOtherBox })
			pushTextOp(ops, I90_FIELDS.accommodationOtherText, other)
		}
	}

	// Part 5 statement 1.A — checked only for a self-prepared English filing;
	// interpreter/preparer cases are stopped upstream (they need Parts 6/7).
	if (answers.form.preparedSelfInEnglish === 'yes') {
		ops.push({ kind: 'check', field: I90_FIELDS.statementSelfEnglish })
	}

	return ops
}
