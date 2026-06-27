import { describe, expect, test } from "bun:test";

import {
  getWizardCanContinue,
  getWizardCompletionPercent,
  getWizardStep,
  wizardSteps,
} from "./wizard-model.ts";

describe("I-765 wizard model", () => {
  test("keeps legal-judgment steps explicit and export language safe", () => {
    expect(wizardSteps).toHaveLength(10);
    expect(getWizardStep(0).requiresLegalAcknowledgment).toBe(true);
    expect(getWizardStep(5).requiresLegalAcknowledgment).toBe(true);
    expect(getWizardStep(9).continueLabel).toBe("Export PDF");
    expect(getWizardStep(9).title).not.toContain("Submit");
  });

  test("uses shared schema gating for executable local draft answers", () => {
    expect(getWizardCanContinue("reason", {})).toBe(false);
    expect(getWizardCanContinue("reason", { reason: "renewal" })).toBe(true);
    expect(getWizardCanContinue("eligibility", { reason: "renewal" })).toBe(false);
    expect(getWizardCanContinue("eligibility", { eligibilityCategory: "c8" })).toBe(true);
    expect(getWizardCanContinue("review", { reviewAcknowledged: true })).toBe(true);
    expect(getWizardCanContinue("identity", {})).toBe(true);
  });

  test("computes progress from shared executable non-PII fields", () => {
    expect(getWizardCompletionPercent({})).toBe(0);
    expect(getWizardCompletionPercent({ reason: "renewal" })).toBe(33);
    expect(
      getWizardCompletionPercent({
        reason: "renewal",
        eligibilityCategory: "c33",
        reviewAcknowledged: true,
      }),
    ).toBe(100);
  });
});
