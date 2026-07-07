import type { ApplicationKind, I90DraftAnswers } from '@convex/shared/applicationShapes'
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
} as const

// Part 2 Item 2 destination per collected replacement reason. Every value the
// interview offers maps to a printed box: 'lost' and 'stolen' share 2.a
// ("lost, stolen, or destroyed"), 'damaged' is the printed "mutilated" (2.c),
// 'error' is the DHS data-error box (2.d), 'nameChange' is 2.e.
const REPLACEMENT_REASON_FIELDS: Record<
	NonNullable<I90DraftAnswers['form']['replacementReason']>,
	string
> = {
	lost: I90_FIELDS.reasonLostStolenDestroyed,
	stolen: I90_FIELDS.reasonLostStolenDestroyed,
	damaged: I90_FIELDS.reasonMutilated,
	error: I90_FIELDS.reasonDhsError,
	nameChange: I90_FIELDS.reasonNameChanged,
}

/**
 * Build the fill ops for an I-90 draft. form.cardExpirationDate stays
 * unmapped — no expiration-date field exists on this edition.
 *
 * TODO(M2-T2): Part 2 Item 1 "My status is" (P2_checkbox1[0..2] = lawful
 * permanent resident / commuter / conditional) stays unmapped: the interview
 * does not collect immigration status, and defaulting everyone to 1.a would
 * mis-file commuter or conditional residents. Needs a new interview step
 * before it can be wired (see docs/M2-T1-form-field-audit.md, rec. 2–3).
 */
export function buildI90Ops(answers: I90DraftAnswers, applicationKind: ApplicationKind): FillOp[] {
	const ops: FillOp[] = []
	const personFacts = answers.personFacts

	// Part 2 Item 2 reason (Section A): a renewal is always the expiring-card
	// box (2.f); a replacement follows the collected reason. 'initial' is not
	// a supported I-90 situation, and a replacement draft that has not yet
	// answered the reason step emits nothing rather than guessing.
	if (applicationKind === 'renewal') {
		ops.push({ kind: 'check', field: I90_FIELDS.reasonExpiring })
	} else if (applicationKind === 'replacement' && answers.form.replacementReason !== undefined) {
		ops.push({ kind: 'check', field: REPLACEMENT_REASON_FIELDS[answers.form.replacementReason] })
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
	pushTextOp(ops, I90_FIELDS.countryOfBirth, personFacts.countryOfBirth)

	return ops
}
