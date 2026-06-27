import { describe, expect, test } from "bun:test";

import { localLoopRepository } from "./repository.ts";

describe("local loop repository", () => {
  test("autosaves schema-approved I-765 draft answers and progress metadata", () => {
    const before = localLoopRepository.getSnapshot();
    const beforeDocumentIds = before.documents.map((document) => document.id);
    const beforeCaseIds = before.cases.map((caseSummary) => caseSummary.id);

    const result = localLoopRepository.saveI765DraftPatch({
      patch: {
        reason: "renewal",
        eligibilityCategory: "c8",
        aNumber: "A123456789",
      },
      currentStep: 6,
      savedAt: "2026-06-27T17:00:00.000Z",
    });

    const after = localLoopRepository.getSnapshot();

    expect(result.acceptedKeys).toEqual(["reason", "eligibilityCategory"]);
    expect(result.rejectedKeys).toEqual(["aNumber"]);
    expect(after.activeApplication?.answers).toEqual({
      reason: "renewal",
      eligibilityCategory: "c8",
    });
    expect(after.activeApplication?.currentStep).toBe(6);
    expect(after.activeApplication?.completionPercent).toBe(67);
    expect(after.activeApplication?.updatedAt).toBe("2026-06-27T17:00:00.000Z");
    expect(after.documents.map((document) => document.id)).toEqual(beforeDocumentIds);
    expect(after.cases.map((caseSummary) => caseSummary.id)).toEqual(beforeCaseIds);
  });

  test("does not advance the draft when every patch field is rejected", () => {
    const before = localLoopRepository.getSnapshot().activeApplication;

    const result = localLoopRepository.saveI765DraftPatch({
      patch: {
        unknownField: "ignored",
        passportNumber: "123456789",
      },
      currentStep: 10,
      savedAt: "2026-06-27T18:00:00.000Z",
    });

    const after = localLoopRepository.getSnapshot().activeApplication;

    expect(result.acceptedKeys).toEqual([]);
    expect(result.rejectedKeys).toEqual(["unknownField", "passportNumber"]);
    expect(after).toEqual(before);
  });

  test("does not move saved progress backwards when editing an earlier step", () => {
    localLoopRepository.saveI765DraftPatch({
      patch: { eligibilityCategory: "c9" },
      currentStep: 6,
      savedAt: "2026-06-27T19:00:00.000Z",
    });

    localLoopRepository.saveI765DraftPatch({
      patch: { reason: "replacement" },
      currentStep: 1,
      savedAt: "2026-06-27T19:05:00.000Z",
    });

    expect(localLoopRepository.getSnapshot().activeApplication?.currentStep).toBe(6);
  });

  test("ignores non-finite current step values when autosaving", () => {
    const before = localLoopRepository.getSnapshot().activeApplication?.currentStep;

    localLoopRepository.saveI765DraftPatch({
      patch: { reviewAcknowledged: true },
      currentStep: Number.NaN,
      savedAt: "2026-06-27T20:00:00.000Z",
    });

    expect(localLoopRepository.getSnapshot().activeApplication?.currentStep).toBe(before);
  });
});
