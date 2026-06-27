import { describe, expect, test } from "bun:test";

import {
  applyI765DraftPatch,
  getI765CanContinue,
  getI765CompletionPercent,
  getI765Step,
  i765WizardSteps,
} from "./i765.ts";

describe("I-765 shared wizard schema", () => {
  test("declares the ten-step wizard with legal gates and no USCIS submission wording", () => {
    expect(i765WizardSteps).toHaveLength(10);
    expect(getI765Step(0).id).toBe("reason");
    expect(getI765Step(5).id).toBe("eligibility");
    expect(getI765Step(8).id).toBe("review");
    expect(getI765Step(9).continueLabel).toBe("Export PDF");
    expect(getI765Step(9).title).not.toContain("Submit");

    const legalGateIds = i765WizardSteps
      .filter((step) => step.requiresLegalAcknowledgment)
      .map((step) => step.id);

    expect(legalGateIds).toEqual(["reason", "status", "eligibility", "review"]);
  });

  test("clamps unsafe step indexes to a valid wizard step", () => {
    expect(getI765Step(-1).id).toBe("reason");
    expect(getI765Step(Number.NaN).id).toBe("reason");
    expect(getI765Step(Number.POSITIVE_INFINITY).id).toBe("export");
  });

  test("allows only schema-declared non-PII fields to patch the local draft", () => {
    const result = applyI765DraftPatch(
      { reason: "renewal" },
      {
        eligibilityCategory: "c8",
        reviewAcknowledged: true,
        aNumber: "A123456789",
        unknownField: "ignored",
      },
    );

    expect(result.answers).toEqual({
      reason: "renewal",
      eligibilityCategory: "c8",
      reviewAcknowledged: true,
    });
    expect(result.acceptedKeys).toEqual(["eligibilityCategory", "reviewAcknowledged"]);
    expect(result.rejectedKeys).toEqual(["aNumber", "unknownField"]);
  });

  test("rejects invalid option values without changing existing answers", () => {
    const result = applyI765DraftPatch(
      {
        reason: "renewal",
        eligibilityCategory: "c9",
      },
      {
        reason: "maybe",
        eligibilityCategory: "c14",
      },
    );

    expect(result.answers).toEqual({
      reason: "renewal",
      eligibilityCategory: "c9",
    });
    expect(result.acceptedKeys).toEqual([]);
    expect(result.rejectedKeys).toEqual(["reason", "eligibilityCategory"]);
  });

  test("gates only executable user-decision steps before continuing", () => {
    expect(getI765CanContinue("reason", {})).toBe(false);
    expect(getI765CanContinue("reason", { reason: "renewal" })).toBe(true);
    expect(getI765CanContinue("eligibility", { reason: "renewal" })).toBe(false);
    expect(getI765CanContinue("eligibility", { eligibilityCategory: "c33" })).toBe(true);
    expect(getI765CanContinue("review", { reviewAcknowledged: false })).toBe(false);
    expect(getI765CanContinue("review", { reviewAcknowledged: true })).toBe(true);
    expect(getI765CanContinue("identity", {})).toBe(true);
  });

  test("computes completion from executable non-PII answers", () => {
    expect(getI765CompletionPercent({})).toBe(0);
    expect(getI765CompletionPercent({ reason: "renewal" })).toBe(33);
    expect(
      getI765CompletionPercent({
        reason: "renewal",
        eligibilityCategory: "c9",
        reviewAcknowledged: true,
      }),
    ).toBe(100);
  });
});
