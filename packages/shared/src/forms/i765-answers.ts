import type { I765Reason } from "./i765";

/**
 * Full on-device I-765 answer set.
 *
 * This is intentionally SEPARATE from {@link I765DraftAnswers} (the non-PII,
 * server-bound "executable choices" record guarded by `applyI765DraftPatch`).
 * `I765FullAnswers` holds the complete form — including identity PII — and is
 * persisted ONLY on the device (Keychain via expo-secure-store) and used to
 * fill the official PDF. It never travels to the server (see docs/DECISIONS.md
 * D7/D8: server PII stays KMS-gated; "submit" = a PDF the user files themselves).
 */
export type I765Sex = "male" | "female";
export type I765MaritalStatus = "single" | "married" | "divorced" | "widowed";
export type I765UnitType = "apt" | "ste" | "flr";

export interface I765Name {
  familyName?: string;
  givenName?: string;
  middleName?: string;
}

export interface I765Address {
  /** "In care of" — mailing address only (Item 5.a). */
  inCareOf?: string;
  street?: string;
  unitType?: I765UnitType;
  unitNumber?: string;
  city?: string;
  /** Two-letter USPS/territory code (e.g. "CA"). */
  state?: string;
  zip?: string;
  /** Foreign-address fields (preparer block only). */
  province?: string;
  postalCode?: string;
  country?: string;
}

export interface I765InterpreterDetails {
  familyName?: string;
  givenName?: string;
  business?: string;
  language?: string;
  daytimePhone?: string;
  mobilePhone?: string;
  email?: string;
}

export interface I765PreparerDetails {
  familyName?: string;
  givenName?: string;
  business?: string;
  address?: I765Address;
  daytimePhone?: string;
  fax?: string;
  email?: string;
}

export interface I765FullAnswers {
  // Part 1 — Reason for Applying (Item 1)
  reason?: I765Reason;

  // Part 2 — Your Full Legal Name (Item 1)
  familyName?: string;
  givenName?: string;
  middleName?: string;
  /** Other names used (Items 2-4); first three slots are mapped to the PDF. */
  otherNames?: readonly I765Name[];

  // Mailing + physical address (Items 5-7)
  mailingAddress?: I765Address;
  mailingSameAsPhysical?: boolean;
  physicalAddress?: I765Address;

  // Other information (Items 8-13)
  aNumber?: string;
  uscisOnlineAccountNumber?: string;
  sex?: I765Sex;
  maritalStatus?: I765MaritalStatus;
  previouslyFiledI765?: boolean;
  ssn?: string;

  // Citizenship + place of birth (Items 14-16)
  countriesOfCitizenship?: readonly string[];
  birthCity?: string;
  birthStateProvince?: string;
  birthCountry?: string;
  /** ISO `YYYY-MM-DD`. Rendered to the form as `MM/DD/YYYY`. */
  dateOfBirth?: string;

  // Information about last arrival (Items 17-26)
  i94Number?: string;
  passportNumber?: string;
  travelDocNumber?: string;
  passportCountryOfIssuance?: string;
  passportExpDate?: string;
  dateOfLastEntry?: string;
  placeOfLastEntry?: string;
  statusAtLastEntry?: string;
  currentImmigrationStatus?: string;
  sevisNumber?: string;

  // Eligibility category (Item 27) — canonical code string, e.g. "(c)(3)(B)".
  eligibilityCode?: string;

  // Category-conditional items (28-31)
  stemDegree?: string; // 28.a — (c)(3)(C)
  stemEmployerEverify?: string; // 28.b
  stemEverifyId?: string; // 28.c
  h4ReceiptNumber?: string; // 29 — (c)(26)
  c8EverArrested?: boolean; // 30 — (c)(8)
  ebReceiptNumber?: string; // 31.a — (c)(35)/(c)(36)
  ebEverArrested?: boolean; // 31.b

  // Part 3 — Applicant's statement + contact
  readsEnglish?: boolean;
  usedInterpreter?: boolean;
  usedPreparer?: boolean;
  daytimePhone?: string;
  mobilePhone?: string;
  email?: string;

  // Parts 4-5 — interpreter / preparer (only when used)
  interpreter?: I765InterpreterDetails;
  preparer?: I765PreparerDetails;

  // Review gate
  reviewAcknowledged?: boolean;
}

export interface I765FieldIssue {
  field: string;
  message: string;
}

/** Patterns for the format-constrained fields. */
const A_NUMBER_RE = /^A?\d{7,9}$/i;
const SSN_RE = /^\d{3}-?\d{2}-?\d{4}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const USCIS_ACCT_RE = /^\d{12}$/;
const ELIGIBILITY_RE = /^\([ac]\)\(\d{1,2}\)(\([A-Za-z]{1,3}\))?$/;

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Accepts the form-facing `MM/DD/YYYY` (what the user types) or ISO `YYYY-MM-DD`. */
export function isValidDate(value: string | undefined): boolean {
  if (!value) return false;
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (us) return isRealDate(Number(us[3]), Number(us[1]), Number(us[2]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return isRealDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  return false;
}

/** Normalize an A-Number to bare digits (strips a leading "A" and separators). */
export function normalizeANumber(value: string | undefined): string {
  return (value ?? "").replace(/[^0-9]/g, "");
}

/**
 * Core fields a complete, file-ready I-765 needs. Optional/conditional fields
 * (other names, interpreter, SSN, etc.) are intentionally excluded — the app
 * never blocks the user, it only surfaces what is still missing.
 */
const REQUIRED_CORE: readonly (keyof I765FullAnswers)[] = [
  "reason",
  "familyName",
  "givenName",
  "sex",
  "maritalStatus",
  "countriesOfCitizenship",
  "birthCountry",
  "dateOfBirth",
  "eligibilityCode",
];

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((entry) => hasValue(entry));
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return true;
}

function addressComplete(address: I765Address | undefined): boolean {
  if (!address) return false;
  return (
    hasValue(address.street) &&
    hasValue(address.city) &&
    hasValue(address.state) &&
    hasValue(address.zip)
  );
}

/** Field-level format validation. Returns one issue per malformed field. */
export function validateI765Answers(answers: I765FullAnswers): I765FieldIssue[] {
  const issues: I765FieldIssue[] = [];

  if (hasValue(answers.aNumber) && !A_NUMBER_RE.test(answers.aNumber!.replace(/[\s-]/g, ""))) {
    issues.push({ field: "aNumber", message: "A-Number should be 7-9 digits (e.g. A123456789)." });
  }
  if (hasValue(answers.ssn) && !SSN_RE.test(answers.ssn!.trim())) {
    issues.push({ field: "ssn", message: "SSN should be 9 digits (e.g. 123-45-6789)." });
  }
  if (
    hasValue(answers.uscisOnlineAccountNumber) &&
    !USCIS_ACCT_RE.test(answers.uscisOnlineAccountNumber!.replace(/\s/g, ""))
  ) {
    issues.push({
      field: "uscisOnlineAccountNumber",
      message: "USCIS Online Account Number is 12 digits.",
    });
  }
  if (hasValue(answers.mailingAddress?.zip) && !ZIP_RE.test(answers.mailingAddress!.zip!.trim())) {
    issues.push({ field: "mailingAddress.zip", message: "ZIP code should be 5 digits." });
  }
  if (hasValue(answers.eligibilityCode) && !ELIGIBILITY_RE.test(answers.eligibilityCode!.trim())) {
    issues.push({
      field: "eligibilityCode",
      message: "Eligibility category looks like (c)(3)(B) or (c)(8).",
    });
  }
  if (hasValue(answers.dateOfBirth) && !isValidDate(answers.dateOfBirth)) {
    issues.push({ field: "dateOfBirth", message: "Enter a valid date of birth (MM/DD/YYYY)." });
  }

  return issues;
}

/** Required core fields that are still empty (for the progress + review screens). */
export function getI765MissingCoreFields(answers: I765FullAnswers): (keyof I765FullAnswers)[] {
  const missing = REQUIRED_CORE.filter((key) => !hasValue(answers[key]));
  if (!addressComplete(answers.mailingAddress)) {
    missing.push("mailingAddress");
  }
  // When the physical address differs from mailing, Item 7 must be filled too —
  // otherwise the form checks "No" on Item 6 but leaves the address blank.
  if (answers.mailingSameAsPhysical === false && !addressComplete(answers.physicalAddress)) {
    missing.push("physicalAddress");
  }
  return missing;
}

/** 0-100 completion across the required core fields (+ mailing address). */
export function getI765FullCompletionPercent(answers: I765FullAnswers): number {
  const total = REQUIRED_CORE.length + 1; // + mailing address
  const missing = getI765MissingCoreFields(answers).length;
  const done = Math.max(0, total - missing);
  return Math.round((done / total) * 100);
}

/** True when the form has every required core field and no format issues. */
export function isI765ReadyToExport(answers: I765FullAnswers): boolean {
  return (
    getI765MissingCoreFields(answers).length === 0 && validateI765Answers(answers).length === 0
  );
}
