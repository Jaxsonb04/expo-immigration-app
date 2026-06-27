import type { ApplicationSummary } from "../applications";

export type I765FormEdition = "03/13/26";
export type I765Reason = "initial" | "replacement" | "renewal";
export type I765EligibilityCategory = "c8" | "c9" | "c33";
export type I765WizardStepId =
  | "reason"
  | "identity"
  | "address"
  | "biographic"
  | "status"
  | "eligibility"
  | "documents"
  | "statement"
  | "review"
  | "export";

export interface I765DraftAnswers {
  reason?: I765Reason;
  eligibilityCategory?: I765EligibilityCategory;
  reviewAcknowledged?: boolean;
}

export interface I765WizardField {
  key: string;
  label: string;
  pii: boolean;
  executable: boolean;
}

export interface I765WizardStep {
  id: I765WizardStepId;
  eyebrow: string;
  title: string;
  description: string;
  fields?: readonly I765WizardField[];
  requiresLegalAcknowledgment?: boolean;
  continueLabel?: string;
}

export interface I765DraftPatchResult {
  answers: I765DraftAnswers;
  acceptedKeys: string[];
  rejectedKeys: string[];
}

export interface CreateEmptyI765DraftInput {
  id: string;
  createdAt: string;
}

const reasonValues = ["initial", "replacement", "renewal"] as const;
const eligibilityCategoryValues = ["c8", "c9", "c33"] as const;

export const i765WizardSteps: readonly I765WizardStep[] = [
  {
    id: "reason",
    eyebrow: "Step 1 of 10 · Part 1",
    title: "Why are you applying?",
    description:
      "Choose the reason yourself. This can affect filing timing and fees, so the app will not decide it for you.",
    fields: [{ key: "reason", label: "Application reason", pii: false, executable: true }],
    requiresLegalAcknowledgment: true,
  },
  {
    id: "identity",
    eyebrow: "Step 2 of 10 · Part 2",
    title: "Confirm your name",
    description: "Reusable profile fields can pre-fill here later. You always verify before export.",
    fields: [
      { key: "legalFirstName", label: "Legal first name", pii: true, executable: false },
      { key: "legalLastName", label: "Legal last name", pii: true, executable: false },
    ],
  },
  {
    id: "address",
    eyebrow: "Step 3 of 10 · Part 2",
    title: "Confirm your mailing address",
    description: "One grouped address screen keeps the form readable without becoming a giant form.",
    fields: [{ key: "mailingAddress", label: "Mailing address", pii: true, executable: false }],
  },
  {
    id: "biographic",
    eyebrow: "Step 4 of 10 · Part 2",
    title: "Add biographic details",
    description: "A-number remains optional until export and is not stored as real PII in this local build.",
    fields: [
      { key: "dateOfBirth", label: "Date of birth", pii: true, executable: false },
      { key: "aNumber", label: "A-number", pii: true, executable: false },
    ],
  },
  {
    id: "status",
    eyebrow: "Step 5 of 10 · Part 2",
    title: "Describe your arrival and status",
    description:
      "Status fields can involve legal judgment. We ask plainly and keep official USCIS labels secondary.",
    requiresLegalAcknowledgment: true,
  },
  {
    id: "eligibility",
    eyebrow: "Step 6 of 10 · Part 2 Item 27",
    title: "Choose your eligibility category",
    description:
      "This is one of the highest-risk fields. Pick the category you believe applies; the app does not recommend or decide.",
    fields: [{ key: "eligibilityCategory", label: "Eligibility category", pii: false, executable: true }],
    requiresLegalAcknowledgment: true,
  },
  {
    id: "documents",
    eyebrow: "Step 7 of 10 · Checklist",
    title: "Gather supporting documents",
    description: "The vault is metadata-only in v1. Use it for reminders and checklist context, not uploads.",
  },
  {
    id: "statement",
    eyebrow: "Step 8 of 10 · Parts 3-5",
    title: "Applicant statement",
    description: "Confirm contact, interpreter, and preparer details. The app never lists itself as preparer.",
  },
  {
    id: "review",
    eyebrow: "Step 9 of 10 · Review",
    title: "Review and verify",
    description: "You are responsible for verifying every answer before creating the PDF.",
    fields: [{ key: "reviewAcknowledged", label: "Review acknowledgement", pii: false, executable: true }],
    requiresLegalAcknowledgment: true,
  },
  {
    id: "export",
    eyebrow: "Step 10 of 10 · PDF",
    title: "Export signature-ready PDF",
    description: "Export creates a PDF for you to sign and file yourself. The app does not submit to USCIS.",
    continueLabel: "Export PDF",
  },
];

function isI765Reason(value: unknown): value is I765Reason {
  return typeof value === "string" && (reasonValues as readonly string[]).includes(value);
}

function isI765EligibilityCategory(value: unknown): value is I765EligibilityCategory {
  return typeof value === "string" && (eligibilityCategoryValues as readonly string[]).includes(value);
}

function getSafeStepIndex(index: number): number {
  if (!Number.isFinite(index)) {
    return index === Number.POSITIVE_INFINITY ? i765WizardSteps.length - 1 : 0;
  }

  return Math.max(0, Math.min(Math.trunc(index), i765WizardSteps.length - 1));
}

function getI765WizardField(key: string): I765WizardField | undefined {
  for (const step of i765WizardSteps) {
    const field = step.fields?.find((candidate) => candidate.key === key);

    if (field) {
      return field;
    }
  }

  return undefined;
}

export function getI765Step(index: number): I765WizardStep {
  return i765WizardSteps[getSafeStepIndex(index)];
}

export function getI765CanContinue(stepId: I765WizardStepId | string, answers: I765DraftAnswers): boolean {
  switch (stepId) {
    case "reason":
      return isI765Reason(answers.reason);
    case "eligibility":
      return isI765EligibilityCategory(answers.eligibilityCategory);
    case "review":
      return answers.reviewAcknowledged === true;
    default:
      return true;
  }
}

export function applyI765DraftPatch(
  answers: I765DraftAnswers,
  patch: Record<string, unknown>,
): I765DraftPatchResult {
  const nextAnswers: I765DraftAnswers = { ...answers };
  const acceptedKeys: string[] = [];
  const rejectedKeys: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    const field = getI765WizardField(key);

    if (!field || field.pii || !field.executable) {
      rejectedKeys.push(key);
      continue;
    }

    if (key === "reason" && isI765Reason(value)) {
      nextAnswers.reason = value;
      acceptedKeys.push(key);
      continue;
    }

    if (key === "eligibilityCategory" && isI765EligibilityCategory(value)) {
      nextAnswers.eligibilityCategory = value;
      acceptedKeys.push(key);
      continue;
    }

    if (key === "reviewAcknowledged" && typeof value === "boolean") {
      nextAnswers.reviewAcknowledged = value;
      acceptedKeys.push(key);
      continue;
    }

    rejectedKeys.push(key);
  }

  return {
    answers: nextAnswers,
    acceptedKeys,
    rejectedKeys,
  };
}

export function getI765CompletionPercent(answers: I765DraftAnswers): number {
  const completedCount = [
    Boolean(answers.reason),
    Boolean(answers.eligibilityCategory),
    answers.reviewAcknowledged === true,
  ].filter(Boolean).length;

  return Math.round((completedCount / 3) * 100);
}

export function createEmptyI765Draft({
  id,
  createdAt,
}: CreateEmptyI765DraftInput): ApplicationSummary {
  return {
    id,
    typeCode: "I-765",
    title: "I-765 EAD renewal",
    status: "draft",
    currentStep: 0,
    totalSteps: i765WizardSteps.length,
    createdAt,
    updatedAt: createdAt,
    formEdition: "03/13/26",
    completionPercent: 0,
    answers: {},
  };
}
