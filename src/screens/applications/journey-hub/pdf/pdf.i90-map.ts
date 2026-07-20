import type { ApplicationKind, I90DraftAnswers } from '@convex/shared/applicationShapes'
import { formatUsDate, normalizeANumber, pushAddressOps, pushTextOp, type FillOp } from './pdf.fill'

// Fully-qualified AcroForm paths verified against the bundled 2025-02-27
// edition (assets/forms/i-90.pdf).

const S0 = 'form1[0].#subform[0].'
const S1 = 'form1[0].#subform[1].'
const S2 = 'form1[0].#subform[2].'

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
	pushTextOp(ops, I90_FIELDS.countryOfBirth, personFacts.countryOfBirth)

	return ops
}
