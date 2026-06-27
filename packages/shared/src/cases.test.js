import { describe, expect, test } from "bun:test";

import { createManualCaseFromReceipt } from "./cases.ts";

describe("manual case tracker helpers", () => {
  test("creates a manual government-side case from a valid receipt without implying USCIS sync", () => {
    const caseSummary = createManualCaseFromReceipt({
      id: "case-new",
      applicationId: "i765-draft-local",
      receiptNumber: " ioe 123 456 7890 ",
      formCode: "I-765",
      savedAt: "2026-06-27T22:00:00.000Z",
    });

    expect(caseSummary).toEqual({
      id: "case-new",
      applicationId: "i765-draft-local",
      receiptNumber: "IOE1234567890",
      formCode: "I-765",
      currentStatus: "Receipt saved",
      currentStatusText:
        "You added this receipt manually. The app has not checked USCIS live status.",
      source: "manual",
      lastUpdatedAt: "2026-06-27T22:00:00.000Z",
      events: [
        {
          id: "case-new-receipt-saved",
          status: "Receipt saved",
          statusText:
            "You added this receipt manually. The app has not checked USCIS live status.",
          occurredAt: "2026-06-27T22:00:00.000Z",
          source: "manual",
        },
      ],
    });
  });

  test("rejects invalid receipt numbers before creating a case", () => {
    expect(
      createManualCaseFromReceipt({
        id: "case-invalid",
        receiptNumber: "ABC123",
        formCode: "I-765",
        savedAt: "2026-06-27T22:05:00.000Z",
      }),
    ).toBeUndefined();
  });
});
