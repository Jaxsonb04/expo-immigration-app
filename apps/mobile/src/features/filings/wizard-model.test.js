import { describe, expect, test } from "bun:test";

import { getWizardStep, wizardSteps } from "./wizard-model.ts";

describe("I-765 wizard model", () => {
  test("keeps legal-judgment steps explicit and export language safe", () => {
    expect(wizardSteps).toHaveLength(10);
    expect(getWizardStep(0).requiresLegalAcknowledgment).toBe(true);
    expect(getWizardStep(5).requiresLegalAcknowledgment).toBe(true);
    expect(getWizardStep(9).continueLabel).toBe("Export PDF");
    expect(getWizardStep(9).title).not.toContain("Submit");
  });
});
