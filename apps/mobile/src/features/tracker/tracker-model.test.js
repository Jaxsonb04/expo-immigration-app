import { describe, expect, test } from "bun:test";

import { buildReceiptEntryModel, buildTrackerModel } from "./tracker-model.ts";

describe("manual tracker model", () => {
  test("labels local case data as manual and never live USCIS sync", () => {
    const model = buildTrackerModel({
      id: "case-1",
      receiptNumber: "IOE1234567890",
      formCode: "I-765",
      currentStatus: "Case Was Received",
      currentStatusText: "Added manually",
      source: "manual",
      lastUpdatedAt: "2026-06-24T18:00:00.000Z",
      events: [],
    });

    expect(model.sourceLabel).toBe("Manual updates");
    expect(model.syncDisclaimer).toContain("not connected to USCIS");
  });

  test("builds receipt entry copy from normalized validity", () => {
    expect(buildReceiptEntryModel(" ioe 123 456 7890 ")).toEqual({
      normalizedReceiptNumber: "IOE1234567890",
      canSave: true,
      helperText: "Preview receipt: IOE1234567890",
      errorText: undefined,
    });

    expect(buildReceiptEntryModel("IOE123")).toEqual({
      normalizedReceiptNumber: "IOE123",
      canSave: false,
      helperText: undefined,
      errorText: "Use 3 letters followed by 10 numbers.",
    });

    expect(buildReceiptEntryModel("")).toEqual({
      normalizedReceiptNumber: "",
      canSave: false,
      helperText: "Enter the receipt from your USCIS notice. Updates stay manual in this build.",
      errorText: undefined,
    });

    expect(buildReceiptEntryModel("   ")).toEqual({
      normalizedReceiptNumber: "",
      canSave: false,
      helperText: "Enter the receipt from your USCIS notice. Updates stay manual in this build.",
      errorText: undefined,
    });
  });
});
