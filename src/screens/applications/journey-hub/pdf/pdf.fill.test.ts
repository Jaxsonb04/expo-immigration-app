// @vitest-environment node
import type { I765DraftAnswers, I90DraftAnswers } from '@convex/shared/applicationShapes'
import { emptyDraftAnswers } from '@convex/shared/applicationShapes'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, test } from 'vitest'
import {
	applyOps,
	formatUsDate,
	normalizeANumber,
	parseUnit,
	splitEligibilityCategory,
	type FillOp,
} from './pdf.fill'
import { renderDraftPreview, renderFilingPackage } from './pdf.render'
import { buildI765Ops, I765_FIELDS } from './pdf.i765-map'
import { buildI90Ops, I90_FIELDS } from './pdf.i90-map'

// The render path is pure (no React Native imports), so it runs against the
// REAL bundled USCIS templates here — the field-existence tests are the
// tripwire that fires when a new edition renames AcroForm fields.

const i765Template = readFileSync(
	fileURLToPath(new URL('../../../../../assets/forms/i-765.pdf', import.meta.url)),
)
const i90Template = readFileSync(
	fileURLToPath(new URL('../../../../../assets/forms/i-90.pdf', import.meta.url)),
)

async function fieldNamesOf(template: Uint8Array): Promise<string[]> {
	const doc = await PDFDocument.load(template, { ignoreEncryption: true })
	return doc
		.getForm()
		.getFields()
		.map((field) => field.getName())
}

const fullI765Draft: I765DraftAnswers = {
	personFacts: {
		givenName: 'Maria',
		middleName: 'Q',
		familyName: 'Santos',
		dateOfBirth: '1990-01-05',
		countryOfBirth: 'Mexico',
		cityOfBirth: 'Oaxaca',
		stateProvinceOfBirth: 'Oaxaca',
		countryOfCitizenship: 'Mexico',
		secondCountryOfCitizenship: 'Canada',
		daytimePhone: '4155550134',
		email: 'maria@example.com',
		aNumber: 'A12345678',
		mailingAddress: {
			street: '2350 Mission St',
			unit: 'APT 4B',
			city: 'San Francisco',
			state: 'ca',
			zipCode: '94110',
		},
		eligibilityCategory: 'C08',
		gender: 'female',
		maritalStatus: 'single',
		hasUsedOtherNames: 'yes',
		otherNames: [{ familyName: 'Santos', givenName: 'Mari' }],
		dateOfLastEntry: '2019-08-14',
		placeOfLastEntry: 'JFK Airport, New York',
		statusAtLastEntry: 'F-1 student',
		currentImmigrationStatus: 'Pending asylum applicant',
		usedTravelDocument: 'yes',
		passportNumber: 'G12345678',
		travelDocCountryOfIssuance: 'Mexico',
		travelDocExpirationDate: '2026-01-01',
		i94Number: '12345678901',
		sevisNumber: 'N1234567890',
	},
	form: {
		previousEadCardNumber: 'ABC1234567890',
		replacementReason: 'lost',
		previouslyFiledI765: 'no',
		preparedSelfInEnglish: 'yes',
		physicalAddressSameAsMailing: 'no',
		physicalAddress: {
			street: '9 Elm St',
			unit: 'APT 2',
			city: 'Austin',
			state: 'tx',
			zipCode: '78701',
		},
		c8EverArrestedOrConvicted: 'no',
	},
}

const fullI90Draft: I90DraftAnswers = {
	personFacts: {
		givenName: 'Maria',
		middleName: 'Q',
		familyName: 'Santos',
		dateOfBirth: '1990-01-05',
		countryOfBirth: 'Mexico',
		cityOfBirth: 'Oaxaca',
		daytimePhone: '4155550134',
		email: 'maria@example.com',
		gender: 'female',
		motherGivenName: 'Rosa',
		fatherGivenName: 'Miguel',
		classOfAdmission: 'IR1',
		dateOfAdmission: '2015-06-10',
		heightFeet: '5',
		heightInches: '4',
		weightPounds: '85',
		eyeColor: 'hazel',
		hairColor: 'sandy',
		ethnicity: 'notHispanicOrLatino',
		races: ['asian', 'white'],
		locationAppliedVisa: 'Ciudad Juarez, Mexico',
		locationIssuedVisa: 'Ciudad Juarez, Mexico',
		becameResidentVia: 'immigrantVisa',
		destinationAtAdmission: 'San Francisco, CA',
		portOfEntryCityState: 'San Ysidro, CA',
		everInProceedings: 'no',
		filedI407OrAbandoned: 'no',
		aNumber: 'A12345678',
		mailingAddress: {
			street: '2350 Mission St',
			unit: 'STE 200',
			city: 'San Francisco',
			state: 'ca',
			zipCode: '94110',
		},
	},
	form: {
		cardStatus: 'permanentResident',
		cardExpirationDate: '2027-03-15',
		replacementReason: 'lost',
		nameChangedSinceIssuance: 'no',
		physicalAddressSameAsMailing: 'yes',
		preparedSelfInEnglish: 'yes',
		requestingAccommodation: 'no',
	},
}

describe('I-765 field map against the bundled template', () => {
	test('every I765_FIELDS path exists in the real template', async () => {
		const names = await fieldNamesOf(i765Template)
		for (const path of Object.values(I765_FIELDS)) {
			expect(names).toContain(path)
		}
	})

	test('every op emitted for a full draft targets a field that exists', async () => {
		const names = await fieldNamesOf(i765Template)
		for (const kind of ['initial', 'renewal', 'replacement'] as const) {
			for (const op of buildI765Ops(fullI765Draft, kind)) {
				expect(names).toContain(op.field)
			}
		}
	})

	// Geometry tripwire: these indices were verified by widget x/y coordinates
	// and deliberately do NOT follow visual order. Pin the literal paths so a
	// well-meaning "normalization" (e.g. apt back to Unit[0]) fails loudly
	// instead of silently checking the wrong box on a federal form — every
	// sibling index exists in the template, so the existence tests alone
	// cannot catch a swap.
	test('pins the counterintuitive checkbox indices to literal paths', () => {
		expect(I765_FIELDS.mailingUnitApt).toBe('form1[0].Page2[0].Pt2Line5_Unit[2]')
		expect(I765_FIELDS.mailingUnitSte).toBe('form1[0].Page2[0].Pt2Line5_Unit[0]')
		expect(I765_FIELDS.mailingUnitFlr).toBe('form1[0].Page2[0].Pt2Line5_Unit[1]')
		expect(I765_FIELDS.reasonInitial).toBe('form1[0].Page1[0].Part1_Checkbox[0]')
		expect(I765_FIELDS.reasonReplacement).toBe('form1[0].Page1[0].Part1_Checkbox[1]')
		expect(I765_FIELDS.reasonRenewal).toBe('form1[0].Page1[0].Part1_Checkbox[2]')
	})
})

describe('I-90 field map against the bundled template', () => {
	test('every I90_FIELDS path exists in the real template', async () => {
		const names = await fieldNamesOf(i90Template)
		for (const path of Object.values(I90_FIELDS)) {
			expect(names).toContain(path)
		}
	})

	test('every op emitted for a full draft targets a field that exists', async () => {
		const names = await fieldNamesOf(i90Template)
		for (const kind of ['renewal', 'replacement'] as const) {
			for (const op of buildI90Ops(fullI90Draft, kind)) {
				expect(names).toContain(op.field)
			}
		}
	})

	// Geometry tripwire: the I-90 unit boxes are in plain visual order —
	// DIFFERENT from the I-765's shuffled indices — so pin the literal paths
	// to catch a cross-form copy-paste of the wrong ordering.
	test('pins the unit checkbox indices to literal paths', () => {
		expect(I90_FIELDS.mailingUnitApt).toBe('form1[0].#subform[0].P1_checkbox6c_Unit[0]')
		expect(I90_FIELDS.mailingUnitSte).toBe('form1[0].#subform[0].P1_checkbox6c_Unit[1]')
		expect(I90_FIELDS.mailingUnitFlr).toBe('form1[0].#subform[0].P1_checkbox6c_Unit[2]')
	})

	// Same tripwire for the Part 2 Item 2 reason boxes: the P2_checkbox2
	// indices do NOT follow the printed 2.a–2.j order (verified against the
	// template's own TU tooltips and export values — 2.a is [5], 2.e is [0]).
	// Every sibling index exists, so only literal pins catch a renumbering.
	test('pins the Part 2 reason checkbox indices to literal paths', () => {
		expect(I90_FIELDS.reasonLostStolenDestroyed).toBe('form1[0].#subform[1].P2_checkbox2[5]')
		expect(I90_FIELDS.reasonMutilated).toBe('form1[0].#subform[1].P2_checkbox2[7]')
		expect(I90_FIELDS.reasonDhsError).toBe('form1[0].#subform[1].P2_checkbox2[4]')
		expect(I90_FIELDS.reasonNameChanged).toBe('form1[0].#subform[1].P2_checkbox2[0]')
		expect(I90_FIELDS.reasonExpiring).toBe('form1[0].#subform[1].P2_checkbox2[1]')
	})

	// Same tripwire for Part 2 Item 1 (status) and the Section B (conditional
	// resident, Item 3) reasons — both verified against TU tooltips + export
	// values ('1a'-'1c', '3a'-'3e'). Item 1 follows printed order; Section B
	// does not (3.a is [4]).
	test('pins the status and Section B reason checkbox indices to literal paths', () => {
		expect(I90_FIELDS.statusPermanentResident).toBe('form1[0].#subform[1].P2_checkbox1[0]')
		expect(I90_FIELDS.statusCommuter).toBe('form1[0].#subform[1].P2_checkbox1[1]')
		expect(I90_FIELDS.statusConditionalResident).toBe('form1[0].#subform[1].P2_checkbox1[2]')
		expect(I90_FIELDS.reasonCrLostStolenDestroyed).toBe('form1[0].#subform[2].P2_checkbox3[4]')
		expect(I90_FIELDS.reasonCrMutilated).toBe('form1[0].#subform[2].P2_checkbox3[1]')
		expect(I90_FIELDS.reasonCrDhsError).toBe('form1[0].#subform[2].P2_checkbox3[2]')
		expect(I90_FIELDS.reasonCrNameChanged).toBe('form1[0].#subform[2].P2_checkbox3[3]')
	})

	test('every mapped status and reason box is checkable on the real template', async () => {
		const doc = await PDFDocument.load(i90Template, { ignoreEncryption: true })
		const form = doc.getForm()
		const checkboxFields = [
			I90_FIELDS.statusPermanentResident,
			I90_FIELDS.statusCommuter,
			I90_FIELDS.statusConditionalResident,
			I90_FIELDS.reasonLostStolenDestroyed,
			I90_FIELDS.reasonMutilated,
			I90_FIELDS.reasonDhsError,
			I90_FIELDS.reasonNameChanged,
			I90_FIELDS.reasonExpiring,
			I90_FIELDS.reasonCrLostStolenDestroyed,
			I90_FIELDS.reasonCrMutilated,
			I90_FIELDS.reasonCrDhsError,
			I90_FIELDS.reasonCrNameChanged,
		]
		const ops: FillOp[] = checkboxFields.map((field) => ({ kind: 'check', field }))
		expect(applyOps(form, ops)).toEqual({ filledCount: checkboxFields.length, failedFields: [] })
		for (const field of checkboxFields) {
			expect(form.getCheckBox(field).isChecked()).toBe(true)
		}
	})
})

describe('buildI765Ops', () => {
	const ops = buildI765Ops(fullI765Draft, 'renewal')

	test('maps citizenship, place of birth, and contact info (slice 3a)', () => {
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.citizenship1, value: 'Mexico' })
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.citizenship2, value: 'Canada' })
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.cityOfBirth, value: 'Oaxaca' })
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.stateProvinceOfBirth,
			value: 'Oaxaca',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.daytimePhone,
			value: '4155550134',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.email,
			value: 'maria@example.com',
		})
	})

	test('maps Part 2 Other Information and the Part 3 statement (I-765 remainder)', () => {
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.sexFemale })
		expect(ops).not.toContainEqual({ kind: 'check', field: I765_FIELDS.sexMale })
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.maritalSingle })
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.previouslyFiledNo })
		expect(ops).not.toContainEqual({ kind: 'check', field: I765_FIELDS.previouslyFiledYes })
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.statementSelfEnglish })
	})

	test('pins the Other Information checkbox indices to literal paths', () => {
		// Line9_* is Item 10 SEX and Line10_* is Item 11 MARITAL STATUS on this
		// edition — verified from its own tooltips + export values.
		expect(I765_FIELDS.sexFemale).toBe('form1[0].Page2[0].Line9_Checkbox[0]')
		expect(I765_FIELDS.sexMale).toBe('form1[0].Page2[0].Line9_Checkbox[1]')
		expect(I765_FIELDS.maritalWidowed).toBe('form1[0].Page2[0].Line10_Checkbox[0]')
		expect(I765_FIELDS.maritalDivorced).toBe('form1[0].Page2[0].Line10_Checkbox[1]')
		expect(I765_FIELDS.maritalSingle).toBe('form1[0].Page2[0].Line10_Checkbox[2]')
		expect(I765_FIELDS.maritalMarried).toBe('form1[0].Page2[0].Line10_Checkbox[3]')
		expect(I765_FIELDS.statementSelfEnglish).toBe('form1[0].Page4[0].Pt3Line1Checkbox[1]')
	})

	test('never fills the SSN box — the app deliberately does not collect it', () => {
		// The SSN is not in the stored shape at all, and no op may ever target
		// Item 13 even if a draft were hand-written with one.
		expect(ops.some((op) => op.field === I765_FIELDS.ssn)).toBe(false)
		const forced = buildI765Ops(
			{ ...fullI765Draft, form: { ...fullI765Draft.form, ssn: '123456789' } as never },
			'renewal',
		)
		expect(forced.some((op) => op.field === I765_FIELDS.ssn)).toBe(false)
	})

	test('every marital-status option maps to a distinct checkable box', async () => {
		const names = await fieldNamesOf(i765Template)
		const doc = await PDFDocument.load(i765Template, { ignoreEncryption: true })
		const form = doc.getForm()
		const maritalFields = [
			I765_FIELDS.maritalSingle,
			I765_FIELDS.maritalMarried,
			I765_FIELDS.maritalDivorced,
			I765_FIELDS.maritalWidowed,
		]
		expect(new Set(maritalFields).size).toBe(4)
		for (const field of maritalFields) expect(names).toContain(field)
		expect(
			applyOps(
				form,
				maritalFields.map((field) => ({ kind: 'check', field }) as FillOp),
			),
		).toEqual({ filledCount: 4, failedFields: [] })
	})

	test('maps the final I-765 items: other names, physical address, last arrival, category', () => {
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.otherName1Family,
			value: 'Santos',
		})
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.otherName1Given, value: 'Mari' })
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.physicalSameNo })
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.physicalStreet,
			value: '9 Elm St',
		})
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.physicalUnitApt })
		expect(ops).toContainEqual({ kind: 'select', field: I765_FIELDS.physicalState, value: 'TX' })
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.i94Number, value: '12345678901' })
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.passportNumber,
			value: 'G12345678',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.travelDocExpDate,
			value: '01/01/2026',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.dateOfLastEntry,
			value: '08/14/2019',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.placeOfLastEntry,
			value: 'JFK Airport, New York',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.sevisNumber,
			value: 'N1234567890',
		})
		// C08 draft: the arrest answer box, and no C26 receipt op.
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.c8ArrestedNo })
		expect(ops.some((op) => op.field === I765_FIELDS.c26ReceiptNumber)).toBe(false)
	})

	test('two and three other names land on the correct printed rows (swapped indices)', () => {
		// Literal pins: [1] is the SECOND printed row (Item 3), [0] the THIRD
		// (Item 4) — verified via tooltips + y-geometry on this edition.
		expect(I765_FIELDS.otherName2Family).toBe('form1[0].Page1[0].Line3a_FamilyName[1]')
		expect(I765_FIELDS.otherName3Family).toBe('form1[0].Page1[0].Line3a_FamilyName[0]')
		const three = buildI765Ops(
			{
				...fullI765Draft,
				personFacts: {
					...fullI765Draft.personFacts,
					hasUsedOtherNames: 'yes',
					otherNames: [
						{ familyName: 'First', givenName: 'Row' },
						{ familyName: 'Second', givenName: 'Row' },
						{ familyName: 'Third', givenName: 'Row' },
					],
				},
			},
			'renewal',
		)
		expect(three).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.otherName1Family,
			value: 'First',
		})
		expect(three).toContainEqual({
			kind: 'text',
			field: 'form1[0].Page1[0].Line3a_FamilyName[1]',
			value: 'Second',
		})
		expect(three).toContainEqual({
			kind: 'text',
			field: 'form1[0].Page1[0].Line3a_FamilyName[0]',
			value: 'Third',
		})
		// Two rows: Item 3 filled, Item 4 untouched — no skipped-row look.
		const two = buildI765Ops(
			{
				...fullI765Draft,
				personFacts: {
					...fullI765Draft.personFacts,
					hasUsedOtherNames: 'yes',
					otherNames: [
						{ familyName: 'First', givenName: 'Row' },
						{ familyName: 'Second', givenName: 'Row' },
					],
				},
			},
			'renewal',
		)
		expect(two).toContainEqual({
			kind: 'text',
			field: 'form1[0].Page1[0].Line3a_FamilyName[1]',
			value: 'Second',
		})
		expect(two.some((op) => op.field === 'form1[0].Page1[0].Line3a_FamilyName[0]')).toBe(false)
	})

	test('writes N/A into Other Names 2.a when none were used (instructions rule 3)', () => {
		const none = buildI765Ops(
			{
				...fullI765Draft,
				personFacts: {
					...fullI765Draft.personFacts,
					hasUsedOtherNames: 'no',
					otherNames: [],
				},
			},
			'renewal',
		)
		expect(none).toContainEqual({ kind: 'text', field: I765_FIELDS.otherName1Family, value: 'N/A' })
		expect(none.some((op) => op.field === I765_FIELDS.otherName1Given)).toBe(false)
	})

	test('a same-as-mailing draft leaves Item 7 blank and checks the Yes box', () => {
		const same = buildI765Ops(
			{
				...fullI765Draft,
				form: {
					...fullI765Draft.form,
					physicalAddressSameAsMailing: 'yes',
					physicalAddress: undefined,
				},
			},
			'renewal',
		)
		expect(same).toContainEqual({ kind: 'check', field: I765_FIELDS.physicalSameYes })
		expect(same.some((op) => op.field === I765_FIELDS.physicalStreet)).toBe(false)
	})

	test('formats the date of birth as MM/DD/YYYY', () => {
		expect(ops).toContainEqual({
			kind: 'text',
			field: I765_FIELDS.dateOfBirth,
			value: '01/05/1990',
		})
	})

	test('normalizes the A-Number into the 9-digit comb', () => {
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.aNumber, value: '012345678' })
	})

	test('splits the eligibility category across the Item 27 boxes', () => {
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.eligibilityLetter, value: 'c' })
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.eligibilityNumber, value: '8' })
	})

	test('keeps two-digit eligibility categories intact', () => {
		const c33 = buildI765Ops(
			{
				...fullI765Draft,
				personFacts: { ...fullI765Draft.personFacts, eligibilityCategory: 'C33' },
			},
			'renewal',
		)
		expect(c33).toContainEqual({ kind: 'text', field: I765_FIELDS.eligibilityLetter, value: 'c' })
		expect(c33).toContainEqual({ kind: 'text', field: I765_FIELDS.eligibilityNumber, value: '33' })
	})

	test('parses the unit into the APT checkbox plus the number box', () => {
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.mailingUnitApt })
		expect(ops).toContainEqual({ kind: 'text', field: I765_FIELDS.mailingUnitNumber, value: '4B' })
	})

	test('uppercases the state for the dropdown select', () => {
		expect(ops).toContainEqual({ kind: 'select', field: I765_FIELDS.mailingState, value: 'CA' })
	})

	test('checks exactly the renewal reason box for a renewal', () => {
		expect(ops).toContainEqual({ kind: 'check', field: I765_FIELDS.reasonRenewal })
		expect(ops).not.toContainEqual({ kind: 'check', field: I765_FIELDS.reasonInitial })
		expect(ops).not.toContainEqual({ kind: 'check', field: I765_FIELDS.reasonReplacement })
	})

	test('checks the initial reason box for an initial application', () => {
		const initial = buildI765Ops(fullI765Draft, 'initial')
		expect(initial).toContainEqual({ kind: 'check', field: I765_FIELDS.reasonInitial })
	})

	test('an empty draft emits no empty-valued ops and never throws', () => {
		const empty = buildI765Ops(emptyDraftAnswers, 'initial')
		for (const op of empty) {
			if (op.kind !== 'check') {
				expect(op.value).not.toBe('')
			}
		}
	})

	// Cross-form tripwire: the I-90 Part 2 mapping must never leak into the
	// I-765 build — every I-765 op stays on that form's Page paths.
	test('never targets I-90 subform paths', () => {
		for (const kind of ['initial', 'renewal', 'replacement'] as const) {
			for (const op of buildI765Ops(fullI765Draft, kind)) {
				expect(op.field).not.toContain('#subform')
			}
		}
	})
})

describe('buildI90Ops', () => {
	const i90ReasonFields = [
		I90_FIELDS.reasonLostStolenDestroyed,
		I90_FIELDS.reasonMutilated,
		I90_FIELDS.reasonDhsError,
		I90_FIELDS.reasonNameChanged,
		I90_FIELDS.reasonExpiring,
	]

	test('maps the name and normalized A-Number', () => {
		const ops = buildI90Ops(fullI90Draft, 'replacement')
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.familyName, value: 'Santos' })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.givenName, value: 'Maria' })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.aNumber, value: '012345678' })
	})

	test('maps the Part 1 additional-information items (slice 3b)', () => {
		const ops = buildI90Ops(fullI90Draft, 'renewal')
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.genderFemale })
		expect(ops).not.toContainEqual({ kind: 'check', field: I90_FIELDS.genderMale })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.motherGivenName, value: 'Rosa' })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.fatherGivenName, value: 'Miguel' })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.classOfAdmission, value: 'IR1' })
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.dateOfAdmission,
			value: '06/10/2015',
		})
	})

	test('maps the biographic block: height selects, padded weight, exact color boxes', () => {
		const ops = buildI90Ops(fullI90Draft, 'renewal')
		expect(ops).toContainEqual({ kind: 'select', field: I90_FIELDS.heightFeet, value: '5' })
		expect(ops).toContainEqual({ kind: 'select', field: I90_FIELDS.heightInches, value: '4' })
		// 85 lbs prints as 0|8|5 across the three misnamed weight combs.
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.weightDigit1, value: '0' })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.weightDigit2, value: '8' })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.weightDigit3, value: '5' })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.eyeHazel })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.hairSandy })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.ethnicityNotHispanic })
		expect(ops).not.toContainEqual({ kind: 'check', field: I90_FIELDS.ethnicityHispanic })
		// Race is multi-select: both chosen boxes, no others.
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.raceAsian })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.raceWhite })
		expect(ops).not.toContainEqual({ kind: 'check', field: I90_FIELDS.raceBlack })
	})

	test('maps the Part 3 processing items and Part 5 statement (slice 3c)', () => {
		const ops = buildI90Ops(fullI90Draft, 'renewal')
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.locationAppliedVisa,
			value: 'Ciudad Juarez, Mexico',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.destinationAtAdmission,
			value: 'San Francisco, CA',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.portOfEntryCityState,
			value: 'San Ysidro, CA',
		})
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.proceedingsNo })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.i407No })
		expect(ops).not.toContainEqual({ kind: 'check', field: I90_FIELDS.proceedingsYes })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.nameChangedNo })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.accommodationNo })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.statementSelfEnglish })
	})

	test('adjustment-of-status drafts emit no entry-detail ops', () => {
		const ops = buildI90Ops(
			{
				...fullI90Draft,
				personFacts: { ...fullI90Draft.personFacts, becameResidentVia: 'adjustmentOfStatus' },
			},
			'renewal',
		)
		expect(ops.some((op) => op.field === I90_FIELDS.destinationAtAdmission)).toBe(false)
		expect(ops.some((op) => op.field === I90_FIELDS.portOfEntryCityState)).toBe(false)
	})

	test('a changed name maps the Y box and the name printed on the card', () => {
		const ops = buildI90Ops(
			{
				...fullI90Draft,
				form: {
					...fullI90Draft.form,
					nameChangedSinceIssuance: 'yes',
					previousFamilyName: 'Santos',
					previousGivenName: 'Maria',
				},
			},
			'renewal',
		)
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.nameChangedYes })
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.previousFamilyName,
			value: 'Santos',
		})
	})

	test('a differing physical address maps Item 7, foreign fields included', () => {
		const ops = buildI90Ops(
			{
				...fullI90Draft,
				form: {
					...fullI90Draft.form,
					physicalAddressSameAsMailing: 'no',
					physicalAddress: {
						street: '1 Calle Real',
						unit: 'APT 2',
						city: 'Tijuana',
						province: 'Baja California',
						postalCode: '22000',
						country: 'Mexico',
					},
				},
			},
			'renewal',
		)
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.physicalStreet,
			value: '1 Calle Real',
		})
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.physicalUnitApt })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.physicalUnitNumber, value: '2' })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.physicalCountry, value: 'Mexico' })
		// Same-as-mailing drafts leave Item 7 blank (the printed convention).
		const sameOps = buildI90Ops(fullI90Draft, 'renewal')
		expect(sameOps.some((op) => op.field === I90_FIELDS.physicalStreet)).toBe(false)
	})

	test('a requested accommodation checks its box and carries the detail text', () => {
		const ops = buildI90Ops(
			{
				...fullI90Draft,
				form: {
					...fullI90Draft.form,
					requestingAccommodation: 'yes',
					accommodationDeafSignLanguage: 'American Sign Language',
				},
			},
			'renewal',
		)
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.accommodationYes })
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.accommodationDeafBox })
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.accommodationDeafText,
			value: 'American Sign Language',
		})
		expect(ops).not.toContainEqual({ kind: 'check', field: I90_FIELDS.accommodationBlindBox })
	})

	test('maps city of birth and contact info (slice 3a)', () => {
		const ops = buildI90Ops(fullI90Draft, 'renewal')
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.cityOfBirth, value: 'Oaxaca' })
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.daytimePhone,
			value: '4155550134',
		})
		expect(ops).toContainEqual({
			kind: 'text',
			field: I90_FIELDS.email,
			value: 'maria@example.com',
		})
	})

	test('uses the plain-order STE checkbox for a suite unit', () => {
		const ops = buildI90Ops(fullI90Draft, 'replacement')
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.mailingUnitSte })
		expect(ops).toContainEqual({ kind: 'text', field: I90_FIELDS.mailingUnitNumber, value: '200' })
	})

	test('checks exactly the expiring-card reason box (2.f) for a renewal', () => {
		const ops = buildI90Ops(fullI90Draft, 'renewal')
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.reasonExpiring })
		for (const field of i90ReasonFields) {
			if (field === I90_FIELDS.reasonExpiring) continue
			expect(ops).not.toContainEqual({ kind: 'check', field })
		}
	})

	test.each([
		['lost', I90_FIELDS.reasonLostStolenDestroyed],
		['stolen', I90_FIELDS.reasonLostStolenDestroyed],
		['damaged', I90_FIELDS.reasonMutilated],
		['error', I90_FIELDS.reasonDhsError],
		['nameChange', I90_FIELDS.reasonNameChanged],
	] as const)('checks exactly the right reason box for a %s replacement', (reason, expected) => {
		const ops = buildI90Ops(
			{ ...fullI90Draft, form: { ...fullI90Draft.form, replacementReason: reason } },
			'replacement',
		)
		expect(ops).toContainEqual({ kind: 'check', field: expected })
		for (const field of i90ReasonFields) {
			if (field === expected) continue
			expect(ops).not.toContainEqual({ kind: 'check', field })
		}
	})

	test('a replacement draft without a reason answer checks no reason box', () => {
		const ops = buildI90Ops(
			{ ...fullI90Draft, form: { ...fullI90Draft.form, replacementReason: undefined } },
			'replacement',
		)
		for (const field of i90ReasonFields) {
			expect(ops).not.toContainEqual({ kind: 'check', field })
		}
	})

	test.each([
		['permanentResident', I90_FIELDS.statusPermanentResident],
		['commuter', I90_FIELDS.statusCommuter],
		['conditionalResident', I90_FIELDS.statusConditionalResident],
	] as const)('checks the Part 2 Item 1 box for a %s draft', (cardStatus, expected) => {
		const ops = buildI90Ops(
			{ ...fullI90Draft, form: { ...fullI90Draft.form, cardStatus } },
			'replacement',
		)
		expect(ops).toContainEqual({ kind: 'check', field: expected })
	})

	test('a self-contradictory conditional-resident renewal draft emits no reason box', () => {
		// Screening (shared/screening.ts) blocks this combination from every UI
		// path; if a raw write ever produces it anyway, the render must not
		// check Section A's expiring box (2.f) a conditional resident cannot use.
		const ops = buildI90Ops(
			{ ...fullI90Draft, form: { cardStatus: 'conditionalResident' } },
			'renewal',
		)
		expect(ops).toContainEqual({ kind: 'check', field: I90_FIELDS.statusConditionalResident })
		for (const field of [...i90ReasonFields, I90_FIELDS.reasonCrLostStolenDestroyed]) {
			expect(ops).not.toContainEqual({ kind: 'check', field })
		}
	})

	test('a draft without a card status checks no status box (no guessing)', () => {
		const ops = buildI90Ops(
			{ ...fullI90Draft, form: { ...fullI90Draft.form, cardStatus: undefined } },
			'renewal',
		)
		for (const field of [
			I90_FIELDS.statusPermanentResident,
			I90_FIELDS.statusCommuter,
			I90_FIELDS.statusConditionalResident,
		]) {
			expect(ops).not.toContainEqual({ kind: 'check', field })
		}
	})

	test.each([
		['lost', I90_FIELDS.reasonCrLostStolenDestroyed],
		['stolen', I90_FIELDS.reasonCrLostStolenDestroyed],
		['damaged', I90_FIELDS.reasonCrMutilated],
		['error', I90_FIELDS.reasonCrDhsError],
		['nameChange', I90_FIELDS.reasonCrNameChanged],
	] as const)(
		'a conditional-resident %s replacement uses Section B, not Section A',
		(reason, expected) => {
			const ops = buildI90Ops(
				{
					...fullI90Draft,
					form: {
						...fullI90Draft.form,
						cardStatus: 'conditionalResident',
						replacementReason: reason,
					},
				},
				'replacement',
			)
			expect(ops).toContainEqual({ kind: 'check', field: expected })
			// Nothing lands in Section A when the status routes to Section B.
			for (const field of i90ReasonFields) {
				expect(ops).not.toContainEqual({ kind: 'check', field })
			}
		},
	)

	test('an empty draft emits no empty-valued ops and never throws', () => {
		const empty = buildI90Ops(emptyDraftAnswers, 'renewal')
		for (const op of empty) {
			if (op.kind !== 'check') {
				expect(op.value).not.toBe('')
			}
		}
	})
})

describe('applyOps', () => {
	test('skips ops for fields absent from this edition and reports them as failed', async () => {
		const doc = await PDFDocument.load(i765Template, { ignoreEncryption: true })
		const ops: FillOp[] = [
			{ kind: 'text', field: 'form1[0].Page1[0].No_Such_Field[0]', value: 'x' },
			{ kind: 'text', field: I765_FIELDS.familyName, value: 'Santos' },
		]
		expect(applyOps(doc.getForm(), ops)).toEqual({
			filledCount: 1,
			failedFields: ['form1[0].Page1[0].No_Such_Field[0]'],
		})
	})

	test('truncates overflowing text to the field maxLength', async () => {
		const doc = await PDFDocument.load(i765Template, { ignoreEncryption: true })
		const form = doc.getForm()
		const { filledCount } = applyOps(form, [
			{ kind: 'text', field: I765_FIELDS.mailingZip, value: '12345-6789' },
		])
		expect(filledCount).toBe(1)
		expect(form.getTextField(I765_FIELDS.mailingZip).getText()).toBe('12345')
	})
})

describe('renderDraftPreview', () => {
	test('renders a flattened, watermarked I-765 preview from a full draft', async () => {
		const { base64, filledCount } = await renderDraftPreview(i765Template.toString('base64'), {
			formType: 'i765',
			answers: fullI765Draft,
			applicationKind: 'renewal',
		})
		const rendered = await PDFDocument.load(base64)
		expect(rendered.getPageCount()).toBe(7)
		// Flatten proof: baked values leave no interactive fields behind.
		expect(rendered.getForm().getFields().length).toBe(0)
		// Every op must land — a silently-skipped op (renamed field, dropdown
		// value missing from options) shows up as a count mismatch here.
		expect(filledCount).toBe(buildI765Ops(fullI765Draft, 'renewal').length)
	})

	test('renders a flattened I-90 preview from a full draft', async () => {
		const { base64, filledCount } = await renderDraftPreview(i90Template.toString('base64'), {
			formType: 'i90',
			answers: fullI90Draft,
			applicationKind: 'renewal',
		})
		const rendered = await PDFDocument.load(base64)
		expect(rendered.getPageCount()).toBeGreaterThan(0)
		expect(rendered.getForm().getFields().length).toBe(0)
		expect(filledCount).toBe(buildI90Ops(fullI90Draft, 'renewal').length)
	})
})

describe('renderFilingPackage fails closed', () => {
	// A template with none of the expected AcroForm fields — the stand-in for a
	// future USCIS edition that renames fields out from under the maps.
	async function blankTemplateBase64(): Promise<string> {
		const doc = await PDFDocument.create()
		doc.addPage()
		return doc.saveAsBase64()
	}

	test('renders a clean, flattened package when every op lands', async () => {
		const { base64, filledCount } = await renderFilingPackage(i765Template.toString('base64'), {
			formType: 'i765',
			answers: fullI765Draft,
			applicationKind: 'renewal',
		})
		const rendered = await PDFDocument.load(base64)
		expect(rendered.getForm().getFields().length).toBe(0)
		expect(filledCount).toBe(buildI765Ops(fullI765Draft, 'renewal').length)
	})

	test('rejects instead of sharing a partially filled clean form', async () => {
		await expect(
			renderFilingPackage(await blankTemplateBase64(), {
				formType: 'i765',
				answers: fullI765Draft,
				applicationKind: 'renewal',
			}),
		).rejects.toThrow(/not created|could not/)
	})

	test('the watermarked draft preview stays fail-open on the same template', async () => {
		const { filledCount } = await renderDraftPreview(await blankTemplateBase64(), {
			formType: 'i765',
			answers: fullI765Draft,
			applicationKind: 'renewal',
		})
		expect(filledCount).toBe(0)
	})
})

describe('formatUsDate', () => {
	test('formats an ISO date as MM/DD/YYYY', () => {
		expect(formatUsDate('1990-01-05')).toBe('01/05/1990')
	})

	test.each(['01/05/1990', '1990-1-5', 'yesterday', ''])('rejects %j', (raw) => {
		expect(formatUsDate(raw)).toBeUndefined()
	})
})

describe('normalizeANumber', () => {
	test('left-pads an 8-digit A-Number to the 9-digit comb', () => {
		expect(normalizeANumber('12345678')).toBe('012345678')
	})

	test('strips the A prefix and separators', () => {
		expect(normalizeANumber('A-123-456-78')).toBe('012345678')
	})

	test.each(['123456', '1234567890', '', 'ABC'])('rejects %j', (raw) => {
		expect(normalizeANumber(raw)).toBeUndefined()
	})
})

describe('splitEligibilityCategory', () => {
	test.each([
		['C08', ['c', '8']],
		['C33', ['c', '33']],
		['A17', ['a', '17']],
		['c9', ['c', '9']],
	])('splits %s into letter and digits', (code, expected) => {
		expect(splitEligibilityCategory(code)).toEqual(expected)
	})

	test.each(['B12', 'C3C', '08', ''])('returns null for %j', (code) => {
		expect(splitEligibilityCategory(code)).toBeNull()
	})
})

describe('parseUnit', () => {
	test.each([
		['APT 4B', { unitType: 'apt', unitNumber: '4B' }],
		['Suite 200', { unitType: 'ste', unitNumber: '200' }],
		['STE 200', { unitType: 'ste', unitNumber: '200' }],
		['FLR 3', { unitType: 'flr', unitNumber: '3' }],
		['Floor 3', { unitType: 'flr', unitNumber: '3' }],
		['#12', { unitNumber: '12' }],
		['Unit 7', { unitNumber: '7' }],
		['4B', { unitNumber: '4B' }],
	])('parses %j', (raw, expected) => {
		expect(parseUnit(raw)).toEqual(expected)
	})
})
