import { getI765CategoryByCode } from "./i765-catalog";
import { normalizeANumber } from "./i765-answers";
import type { I765Address, I765FullAnswers, I765Name, I765UnitType } from "./i765-answers";

/**
 * Mapping from {@link I765FullAnswers} to operations on the official USCIS
 * I-765 AcroForm. Field names are the EXACT fully-qualified names from the
 * (decrypted) live PDF — verified by enumerating the form with pdf-lib, because
 * the internal `LineNN` names do NOT match the printed item numbers
 * (e.g. printed Item 16 "Date of Birth" is field `Line19_DOB`).
 *
 * The runtime filler (apps/mobile) applies these with pdf-lib then flattens,
 * which bakes values into page content and drops the XFA layer so every viewer
 * renders them. This module is pure + platform-agnostic so it is unit-testable.
 */
export type I765PdfOp =
  | { kind: "text"; field: string; value: string }
  | { kind: "check"; field: string }
  | { kind: "dropdown"; field: string; value: string };

const P1 = "form1[0].Page1[0].";
const P2 = "form1[0].Page2[0].";
const P3 = "form1[0].Page3[0].";
const P4 = "form1[0].Page4[0].";
const P5 = "form1[0].Page5[0].";
const P7 = "form1[0].Page7[0].";

/** STE → Unit[0], FLR → Unit[1], APT → Unit[2] (verified widget order). */
const UNIT_INDEX: Record<I765UnitType, number> = { ste: 0, flr: 1, apt: 2 };

function clean(value: string | undefined | null): string {
  return (value ?? "").toString().trim();
}

/** ISO `YYYY-MM-DD` (or an already MM/DD/YYYY string) → `MM/DD/YYYY`. */
export function formatI765Date(value: string | undefined): string {
  const v = clean(value);
  if (!v) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return v;
}

/**
 * Split an eligibility code across Item 27's three boxes (the form labels them
 * "first four / middle three / last three characters"). Concatenated they read
 * back as the original code. e.g. "(c)(3)(B)" → ["(c)(", "3)(", "B)"].
 */
export function splitEligibilityCode(code: string | undefined): [string, string, string] {
  const c = clean(code);
  return [c.slice(0, 4), c.slice(4, 7), c.slice(7, 10)];
}

function pushText(ops: I765PdfOp[], field: string, value: string | undefined): void {
  const v = clean(value);
  if (v) ops.push({ kind: "text", field, value: v });
}

/** Explicit field names for one address block (the form names them unevenly). */
interface AddressFields {
  inCareOf?: string;
  street: string;
  unitBase: string; // e.g. "...Pt2Line5_Unit" → "[0]"/"[1]"/"[2]" appended
  unitNumber: string;
  city: string;
  state: string;
  zip: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

function pushAddress(
  ops: I765PdfOp[],
  address: I765Address | undefined,
  fields: AddressFields
): void {
  if (!address) return;
  if (fields.inCareOf) pushText(ops, fields.inCareOf, address.inCareOf);
  pushText(ops, fields.street, address.street);
  if (address.unitType && clean(address.unitNumber)) {
    ops.push({ kind: "check", field: `${fields.unitBase}[${UNIT_INDEX[address.unitType]}]` });
    pushText(ops, fields.unitNumber, address.unitNumber);
  }
  pushText(ops, fields.city, address.city);
  if (clean(address.state)) {
    ops.push({ kind: "dropdown", field: fields.state, value: clean(address.state) });
  }
  pushText(ops, fields.zip, address.zip);
  if (fields.province) pushText(ops, fields.province, address.province);
  if (fields.postalCode) pushText(ops, fields.postalCode, address.postalCode);
  if (fields.country) pushText(ops, fields.country, address.country);
}

function pushName(ops: I765PdfOp[], fam: string, giv: string, mid: string, name: I765Name): void {
  pushText(ops, fam, name.familyName);
  pushText(ops, giv, name.givenName);
  pushText(ops, mid, name.middleName);
}

/**
 * Build the ordered list of fill operations for a draft. Empty fields are
 * skipped. Signature + date fields are intentionally never filled — the
 * applicant signs the printed copy by hand.
 */
export function buildI765PdfOps(answers: I765FullAnswers): I765PdfOp[] {
  const ops: I765PdfOp[] = [];

  // Part 1 — Reason for applying (Item 1)
  const reasonIndex = { initial: 0, replacement: 1, renewal: 2 } as const;
  if (answers.reason)
    ops.push({ kind: "check", field: `${P1}Part1_Checkbox[${reasonIndex[answers.reason]}]` });

  // Part 2 — Legal name (Item 1)
  pushText(ops, `${P1}Line1a_FamilyName[0]`, answers.familyName);
  pushText(ops, `${P1}Line1b_GivenName[0]`, answers.givenName);
  pushText(ops, `${P1}Line1c_MiddleName[0]`, answers.middleName);

  // Other names used (Items 2-4). The field→item mapping is from the form's
  // embedded tooltips (verified): Line2*→Item 2, Line3*[1]→Item 3, Line3*[0]→
  // Item 4 (the [0]/[1] suffixes do NOT follow visual top-to-bottom order).
  const others = answers.otherNames ?? [];
  if (others[0])
    pushName(
      ops,
      `${P1}Line2a_FamilyName[0]`,
      `${P1}Line2b_GivenName[0]`,
      `${P1}Line2c_MiddleName[0]`,
      others[0]
    );
  if (others[1])
    pushName(
      ops,
      `${P1}Line3a_FamilyName[1]`,
      `${P1}Line3b_GivenName[1]`,
      `${P1}Line3c_MiddleName[1]`,
      others[1]
    );
  if (others[2])
    pushName(
      ops,
      `${P1}Line3a_FamilyName[0]`,
      `${P1}Line3b_GivenName[0]`,
      `${P1}Line3c_MiddleName[0]`,
      others[2]
    );

  // Mailing address (Item 5) — note the split naming: in-care-of/street are
  // Line4a/Line4b, the rest are Pt2Line5_*.
  pushAddress(ops, answers.mailingAddress, {
    inCareOf: `${P2}Line4a_InCareofName[0]`,
    street: `${P2}Line4b_StreetNumberName[0]`,
    unitBase: `${P2}Pt2Line5_Unit`,
    unitNumber: `${P2}Pt2Line5_AptSteFlrNumber[0]`,
    city: `${P2}Pt2Line5_CityOrTown[0]`,
    state: `${P2}Pt2Line5_State[0]`,
    zip: `${P2}Pt2Line5_ZipCode[0]`,
  });
  // Same-as-physical (Item 6) + physical address (Item 7)
  if (answers.mailingSameAsPhysical === true) {
    ops.push({ kind: "check", field: `${P2}Part2Line5_Checkbox[1]` }); // Yes
  } else if (answers.mailingSameAsPhysical === false) {
    ops.push({ kind: "check", field: `${P2}Part2Line5_Checkbox[0]` }); // No
    pushAddress(ops, answers.physicalAddress, {
      street: `${P2}Pt2Line7_StreetNumberName[0]`,
      unitBase: `${P2}Pt2Line7_Unit`,
      unitNumber: `${P2}Pt2Line7_AptSteFlrNumber[0]`,
      city: `${P2}Pt2Line7_CityOrTown[0]`,
      state: `${P2}Pt2Line7_State[0]`,
      zip: `${P2}Pt2Line7_ZipCode[0]`,
    });
  }

  // Other information (Items 8-13). Numeric fields are digit-only on the form.
  pushText(ops, `${P2}Line7_AlienNumber[0]`, normalizeANumber(answers.aNumber));
  pushText(ops, `${P2}Line8_ElisAccountNumber[0]`, answers.uscisOnlineAccountNumber);
  if (answers.sex)
    ops.push({ kind: "check", field: `${P2}Line9_Checkbox[${answers.sex === "female" ? 0 : 1}]` });
  const maritalIndex = { widowed: 0, divorced: 1, single: 2, married: 3 } as const;
  if (answers.maritalStatus)
    ops.push({
      kind: "check",
      field: `${P2}Line10_Checkbox[${maritalIndex[answers.maritalStatus]}]`,
    });
  if (answers.previouslyFiledI765 === true)
    ops.push({ kind: "check", field: `${P2}Line19_Checkbox[1]` });
  else if (answers.previouslyFiledI765 === false)
    ops.push({ kind: "check", field: `${P2}Line19_Checkbox[0]` });
  pushText(ops, `${P2}Line12b_SSN[0]`, clean(answers.ssn).replace(/\D/g, ""));

  // Citizenship (Item 14) — page 2 (Line17a/17b)
  const citizenships = answers.countriesOfCitizenship ?? [];
  pushText(ops, `${P2}Line17a_CountryOfBirth[0]`, citizenships[0]);
  pushText(ops, `${P2}Line17b_CountryOfBirth[0]`, citizenships[1]);

  // Place of birth (Item 15) + DOB (Item 16) — page 3
  pushText(ops, `${P3}Line18a_CityTownOfBirth[0]`, answers.birthCity);
  pushText(ops, `${P3}Line18b_CityTownOfBirth[0]`, answers.birthStateProvince);
  pushText(ops, `${P3}Line18c_CountryOfBirth[0]`, answers.birthCountry);
  pushText(ops, `${P3}Line19_DOB[0]`, formatI765Date(answers.dateOfBirth));

  // Last arrival (Items 17-26)
  pushText(ops, `${P3}Line20a_I94Number[0]`, answers.i94Number);
  pushText(ops, `${P3}Line20b_Passport[0]`, answers.passportNumber);
  pushText(ops, `${P3}Line20c_TravelDoc[0]`, answers.travelDocNumber);
  pushText(ops, `${P3}Line20d_CountryOfIssuance[0]`, answers.passportCountryOfIssuance);
  pushText(ops, `${P3}Line20e_ExpDate[0]`, formatI765Date(answers.passportExpDate));
  pushText(ops, `${P3}Line21_DateOfLastEntry[0]`, formatI765Date(answers.dateOfLastEntry));
  pushText(ops, `${P3}place_entry[0]`, answers.placeOfLastEntry);
  pushText(ops, `${P3}Line23_StatusLastEntry[0]`, answers.statusAtLastEntry);
  pushText(ops, `${P3}Line24_CurrentStatus[0]`, answers.currentImmigrationStatus);
  pushText(ops, `${P3}Line26_SEVISnumber[0]`, answers.sevisNumber);

  // Eligibility category (Item 27) across three boxes
  const [s1, s2, s3] = splitEligibilityCode(answers.eligibilityCode);
  pushText(ops, `${P3}#area[1].section_1[0]`, s1);
  pushText(ops, `${P3}#area[1].section_2[0]`, s2);
  pushText(ops, `${P3}#area[1].section_3[0]`, s3);

  // Category-conditional items (28-31), gated by the selected code
  const category = getI765CategoryByCode(answers.eligibilityCode);
  if (category?.conditionalItem === "item28") {
    pushText(ops, `${P3}Line27a_Degree[0]`, answers.stemDegree);
    pushText(ops, `${P3}Line27b_Everify[0]`, answers.stemEmployerEverify);
    pushText(ops, `${P3}Line27c_EverifyIDNumber[0]`, answers.stemEverifyId);
  }
  if (category?.conditionalItem === "item29") {
    pushText(ops, `${P3}Line28_ReceiptNumber[0]`, answers.h4ReceiptNumber);
  }
  if (category?.conditionalItem === "item30") {
    if (answers.c8EverArrested === true)
      ops.push({ kind: "check", field: `${P3}PtLine29_YesNo[0]` });
    else if (answers.c8EverArrested === false)
      ops.push({ kind: "check", field: `${P3}PtLine29_YesNo[1]` });
  }
  if (category?.conditionalItem === "item31") {
    pushText(ops, `${P3}Line18a_Receipt[0].Line30a_ReceiptNumber[0]`, answers.ebReceiptNumber);
    if (answers.ebEverArrested === true)
      ops.push({ kind: "check", field: `${P3}PtLine30b_YesNo[0]` });
    else if (answers.ebEverArrested === false)
      ops.push({ kind: "check", field: `${P3}PtLine30b_YesNo[1]` });
  }

  // Part 3 — Applicant's statement + contact. Item 1 (1.a "I can read English" /
  // 1.b "an interpreter read it to me") is a perjury-sensitive attestation, so
  // only check a box when the user has explicitly answered — never by default.
  if (answers.usedInterpreter) {
    ops.push({ kind: "check", field: `${P4}Pt3Line1Checkbox[1]` });
    pushText(ops, `${P4}Pt3Line1b_Language[0]`, answers.interpreter?.language);
  } else if (answers.readsEnglish === true) {
    ops.push({ kind: "check", field: `${P4}Pt3Line1Checkbox[0]` });
  }
  if (answers.usedPreparer) {
    ops.push({ kind: "check", field: `${P4}Part3_Checkbox[0]` });
    const preparerName = [answers.preparer?.givenName, answers.preparer?.familyName]
      .map(clean)
      .filter(Boolean)
      .join(" ");
    pushText(ops, `${P4}Pt3Line2_RepresentativeName[0]`, preparerName);
  }
  pushText(ops, `${P4}Pt3Line3_DaytimePhoneNumber1[0]`, answers.daytimePhone);
  pushText(ops, `${P4}Pt3Line4_MobileNumber1[0]`, answers.mobilePhone);
  pushText(ops, `${P4}Pt3Line5_Email[0]`, answers.email);

  // Part 4 — Interpreter (only if used)
  if (answers.usedInterpreter && answers.interpreter) {
    const it = answers.interpreter;
    pushText(ops, `${P4}Pt4Line1a_InterpreterFamilyName[0]`, it.familyName);
    pushText(ops, `${P4}Pt4Line1b_InterpreterGivenName[0]`, it.givenName);
    pushText(ops, `${P4}Pt4Line2_InterpreterBusinessorOrg[0]`, it.business);
    pushText(ops, `${P5}Pt4Line4_InterpreterDaytimeTelephone[0]`, it.daytimePhone);
    pushText(ops, `${P5}Pt4Line5_MobileNumber[0]`, it.mobilePhone);
    pushText(ops, `${P5}Pt4Line6_Email[0]`, it.email);
    pushText(ops, `${P5}Part4_NameofLanguage[0]`, it.language);
  }

  // Part 5 — Preparer (only if used)
  if (answers.usedPreparer && answers.preparer) {
    const pr = answers.preparer;
    pushText(ops, `${P5}Pt5Line1a_PreparerFamilyName[0]`, pr.familyName);
    pushText(ops, `${P5}Pt5Line1b_PreparerGivenName[0]`, pr.givenName);
    pushText(ops, `${P5}Pt5Line2_BusinessName[0]`, pr.business);
    pushAddress(ops, pr.address, {
      street: `${P5}Pt5Line3a_StreetNumberName[0]`,
      unitBase: `${P5}Pt5Line3b_Unit`,
      unitNumber: `${P5}Pt5Line3b_AptSteFlrNumber[0]`,
      city: `${P5}Pt5Line3c_CityOrTown[0]`,
      state: `${P5}Pt5Line3d_State[0]`,
      zip: `${P5}Pt5Line3e_ZipCode[0]`,
      province: `${P5}Pt5Line3f_Province[0]`,
      postalCode: `${P5}Pt5Line3g_PostalCode[0]`,
      country: `${P5}Pt5Line3h_Country[0]`,
    });
    pushText(ops, `${P5}Pt5Line4_DaytimePhoneNumber1[0]`, pr.daytimePhone);
    pushText(ops, `${P5}Pt5Line5_PreparerFaxNumber[0]`, pr.fax);
    pushText(ops, `${P5}Pt5Line6_Email[0]`, pr.email);
  }

  // Part 6 — Additional info page repeats the applicant name + A-Number header
  pushText(ops, `${P7}Line1a_FamilyName[0]`, answers.familyName);
  pushText(ops, `${P7}Line1b_GivenName[0]`, answers.givenName);
  pushText(ops, `${P7}Line1c_MiddleName[0]`, answers.middleName);
  pushText(ops, `${P7}Line7_AlienNumber[0]`, normalizeANumber(answers.aNumber));

  return ops;
}
