import { describe, expect, test } from "bun:test";

import { buildTrackerModel } from "./tracker-model.ts";

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
});
