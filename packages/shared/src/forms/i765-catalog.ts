import type { I765Reason } from "./i765";

/**
 * I-765 eligibility-category catalog (Item 27).
 *
 * Item 27 is free-text on the form and selecting the WRONG code is the single
 * largest cause of denials/RFEs, so this is a UPL-sensitive surface: the app
 * presents plain-English labels to help the user RECOGNIZE their own category,
 * but never decides it for them (see docs/spikes/i765-form-mapping.md).
 *
 * Codes/semantics are from 8 CFR 274a.12 and the USCIS "Who May File"
 * instructions. Fee/online-eligibility/biometrics are deliberately NOT encoded
 * as truth here — they are live lookups (Form G-1055 + uscis.gov) and change
 * frequently (H.R.-1 added non-waivable fees in 2025).
 */
export type I765CategoryGroup =
  | "student"
  | "asylum-protection"
  | "adjustment"
  | "family-employment"
  | "humanitarian"
  | "other";

/** Which category-conditional follow-up item a code triggers (Items 28-31). */
export type I765ConditionalItem = "item28" | "item29" | "item30" | "item31";

export interface I765CategoryInfo {
  /** Canonical code string written to Item 27, e.g. "(c)(3)(B)". */
  code: string;
  /** Stable slug for storage/analytics, e.g. "c3b". */
  id: string;
  /** Plain-English label shown in the picker. */
  label: string;
  /** One-line "who uses this" helper. */
  description: string;
  group: I765CategoryGroup;
  /** Conditional sub-item this code unlocks, if any. */
  conditionalItem?: I765ConditionalItem;
  /**
   * Whether a copy of Form I-94 / passport is part of the required evidence.
   * (c)(9) adjustment applicants are exempt — the one hard carve-out.
   */
  i94Evidence: boolean;
  /** Category-specific evidence beyond the universal set. */
  evidence: readonly string[];
}

export const I765_CATEGORY_GROUP_LABELS: Record<I765CategoryGroup, string> = {
  student: "Students (F-1 / M-1 / J)",
  "asylum-protection": "Asylum, refugee & protection",
  adjustment: "Adjustment of status & NACARA",
  "family-employment": "Family & employment based",
  humanitarian: "Humanitarian & deferred action",
  other: "Other",
};

export const I765_CATEGORY_CATALOG: readonly I765CategoryInfo[] = [
  // Students -----------------------------------------------------------------
  {
    code: "(c)(3)(A)",
    id: "c3a",
    label: "Pre-completion OPT (F-1)",
    description: "F-1 student doing optional practical training before finishing your program.",
    group: "student",
    i94Evidence: true,
    evidence: ["Form I-20 endorsed for OPT by your DSO within the last 30 days"],
  },
  {
    code: "(c)(3)(B)",
    id: "c3b",
    label: "Post-completion OPT (F-1)",
    description: "F-1 student applying for OPT after graduation, in your field of study.",
    group: "student",
    i94Evidence: true,
    evidence: [
      "Form I-20 endorsed for post-completion OPT by your DSO within the last 30 days",
      "File up to 90 days before — and no later than 60 days after — your program end date",
    ],
  },
  {
    code: "(c)(3)(C)",
    id: "c3c",
    label: "STEM OPT extension (F-1)",
    description: "24-month extension for a qualifying STEM degree (Item 28 required).",
    group: "student",
    conditionalItem: "item28",
    i94Evidence: true,
    evidence: [
      "Form I-20 endorsed for the STEM extension",
      "Employer enrolled in E-Verify (name + E-Verify company ID go in Item 28)",
    ],
  },
  {
    code: "(c)(5)",
    id: "c5",
    label: "J-2 spouse / child of exchange visitor",
    description: "Dependent (J-2) of a J-1 exchange visitor.",
    group: "student",
    i94Evidence: true,
    evidence: ["Copy of J-1 principal's documentation", "Proof of relationship"],
  },
  // Asylum / protection ------------------------------------------------------
  {
    code: "(c)(8)",
    id: "c8",
    label: "Pending asylum applicant",
    description: "You filed Form I-589 and it is still pending (Item 30 required).",
    group: "asylum-protection",
    conditionalItem: "item30",
    i94Evidence: true,
    evidence: ["Evidence your Form I-589 asylum application is pending"],
  },
  {
    code: "(a)(5)",
    id: "a5",
    label: "Granted asylum",
    description: "Asylum was already GRANTED (not the same as pending — that is (c)(8)).",
    group: "asylum-protection",
    i94Evidence: true,
    evidence: ["Copy of the order/letter granting you asylum"],
  },
  {
    code: "(a)(3)",
    id: "a3",
    label: "Refugee",
    description: "Admitted to the U.S. as a refugee.",
    group: "asylum-protection",
    i94Evidence: true,
    evidence: ["Copy of your refugee approval / I-94 showing refugee admission"],
  },
  {
    code: "(a)(10)",
    id: "a10",
    label: "Granted withholding of removal",
    description: "Withholding of deportation/removal was granted.",
    group: "asylum-protection",
    i94Evidence: true,
    evidence: ["Copy of the order granting withholding"],
  },
  {
    code: "(a)(12)",
    id: "a12",
    label: "TPS — granted",
    description: "Temporary Protected Status already granted.",
    group: "asylum-protection",
    i94Evidence: true,
    evidence: ["Copy of your TPS approval notice"],
  },
  {
    code: "(c)(19)",
    id: "c19",
    label: "TPS — pending",
    description: "Applied for Temporary Protected Status and it is pending.",
    group: "asylum-protection",
    i94Evidence: true,
    evidence: ["Evidence your Form I-821 TPS application is pending"],
  },
  // Adjustment of status -----------------------------------------------------
  {
    code: "(c)(9)",
    id: "c9",
    label: "Adjustment of status (pending I-485)",
    description: "You filed Form I-485 to become a permanent resident and it is pending.",
    group: "adjustment",
    i94Evidence: false, // (c)(9) is the I-94 evidence carve-out
    evidence: ["Copy of the I-797 receipt notice for your pending Form I-485"],
  },
  {
    code: "(c)(10)",
    id: "c10",
    label: "NACARA / suspension of deportation",
    description: "Applicant for cancellation/suspension or NACARA relief.",
    group: "adjustment",
    i94Evidence: true,
    evidence: ["Evidence your underlying application is pending"],
  },
  // Family / employment ------------------------------------------------------
  {
    code: "(c)(26)",
    id: "c26",
    label: "H-4 spouse of H-1B",
    description: "Dependent spouse (H-4) of an H-1B worker (Item 29 required).",
    group: "family-employment",
    conditionalItem: "item29",
    i94Evidence: true,
    evidence: ["H-1B spouse's most recent I-797 for Form I-129", "Proof of marriage"],
  },
  {
    code: "(c)(35)",
    id: "c35",
    label: "Compelling circumstances — principal",
    description:
      "Principal beneficiary of an approved I-140 with compelling circumstances (Item 31).",
    group: "family-employment",
    conditionalItem: "item31",
    i94Evidence: true,
    evidence: ["I-797 receipt for your Form I-140", "Evidence of compelling circumstances"],
  },
  {
    code: "(c)(36)",
    id: "c36",
    label: "Compelling circumstances — dependent",
    description: "Spouse/child of a (c)(35) principal (Item 31).",
    group: "family-employment",
    conditionalItem: "item31",
    i94Evidence: true,
    evidence: ["Principal's I-140 receipt", "Proof of relationship"],
  },
  // Humanitarian / deferred action ------------------------------------------
  {
    code: "(c)(33)",
    id: "c33",
    label: "DACA — deferred action for childhood arrivals",
    description:
      "Approved or concurrently filing DACA. Requires Form I-765WS. Fee waiver NOT available.",
    group: "humanitarian",
    i94Evidence: true,
    evidence: ["Form I-821D (DACA request)", "Form I-765WS economic-necessity worksheet"],
  },
  {
    code: "(c)(14)",
    id: "c14",
    label: "Deferred action",
    description: "Granted deferred action (other than DACA).",
    group: "humanitarian",
    i94Evidence: true,
    evidence: ["Evidence of the deferred action grant"],
  },
  {
    code: "(c)(31)",
    id: "c31",
    label: "VAWA self-petitioner",
    description: "Abused spouse/child self-petitioner under VAWA.",
    group: "humanitarian",
    i94Evidence: true,
    evidence: ["Evidence your Form I-360 is pending or approved"],
  },
];

const CATEGORY_BY_ID = new Map(I765_CATEGORY_CATALOG.map((entry) => [entry.id, entry]));
const CATEGORY_BY_CODE = new Map(
  I765_CATEGORY_CATALOG.map((entry) => [entry.code.replace(/\s/g, ""), entry])
);

export function getI765CategoryById(id: string | undefined): I765CategoryInfo | undefined {
  return id ? CATEGORY_BY_ID.get(id) : undefined;
}

export function getI765CategoryByCode(code: string | undefined): I765CategoryInfo | undefined {
  return code ? CATEGORY_BY_CODE.get(code.replace(/\s/g, "")) : undefined;
}

/** Reason-for-applying options (Part 1, Item 1). */
export interface I765ReasonInfo {
  value: I765Reason;
  title: string;
  description: string;
}

export const I765_REASON_OPTIONS: readonly I765ReasonInfo[] = [
  {
    value: "initial",
    title: "Initial permission",
    description: "First-time application for employment authorization.",
  },
  {
    value: "renewal",
    title: "Renewal",
    description: "Renewing existing permission. Attach a copy of your current EAD.",
  },
  {
    value: "replacement",
    title: "Replacement",
    description: "Your EAD was lost, stolen, or damaged (not a USCIS error).",
  },
];

/**
 * Universal evidence every paper filer assembles, plus the category-specific
 * items. (c)(9) is exempt from the I-94/passport requirement.
 */
export function getI765DocumentChecklist(
  category: I765CategoryInfo | undefined,
  reason: I765Reason | undefined
): readonly string[] {
  const items: string[] = [];
  if (reason === "renewal" || reason === "replacement") {
    items.push("Copy of your current/most recent EAD (front and back)");
  } else {
    items.push("If you have never had an EAD: a copy of a government-issued photo ID");
  }
  if (category?.i94Evidence !== false) {
    items.push("Copy of your Form I-94 (front and back), or passport / travel document");
  }
  items.push("Two identical passport-style color photos taken within the last 30 days");
  items.push("Form G-28 — only if an attorney or accredited representative represents you");
  for (const item of category?.evidence ?? []) {
    items.push(item);
  }
  return items;
}

/** US states + territories for the address dropdowns (matches the PDF options). */
export const I765_STATE_CODES: readonly string[] = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "AS",
  "GU",
  "MP",
  "PR",
  "VI",
  "AA",
  "AE",
  "AP",
  "FM",
  "MH",
  "PW",
];
