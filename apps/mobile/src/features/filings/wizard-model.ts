export interface WizardStep {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  requiresLegalAcknowledgment?: boolean;
  continueLabel?: string;
}

export const wizardSteps: WizardStep[] = [
  {
    id: "reason",
    eyebrow: "Step 1 of 10 · Part 1",
    title: "Why are you applying?",
    description:
      "Choose the reason yourself. This can affect filing timing and fees, so the app will not decide it for you.",
    requiresLegalAcknowledgment: true,
  },
  {
    id: "identity",
    eyebrow: "Step 2 of 10 · Part 2",
    title: "Confirm your name",
    description: "Reusable profile fields can pre-fill here later. You always verify before export.",
  },
  {
    id: "address",
    eyebrow: "Step 3 of 10 · Part 2",
    title: "Confirm your mailing address",
    description: "One grouped address screen keeps the form readable without becoming a giant form.",
  },
  {
    id: "biographic",
    eyebrow: "Step 4 of 10 · Part 2",
    title: "Add biographic details",
    description: "A-number remains optional until export and is not stored as real PII in this local build.",
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

export function getWizardStep(index: number): WizardStep {
  return wizardSteps[Math.max(0, Math.min(index, wizardSteps.length - 1))];
}
