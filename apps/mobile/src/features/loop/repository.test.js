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

  test("saves a valid manual case receipt without mutating the filing draft or vault", () => {
    const before = localLoopRepository.getSnapshot();
    const beforeActiveApplication = before.activeApplication;
    const beforeDocumentIds = before.documents.map((document) => document.id);

    const result = localLoopRepository.saveManualCaseReceipt({
      id: "case-maestro-local",
      applicationId: "i765-draft-local",
      receiptNumber: " ysc 123 456 7890 ",
      formCode: "I-765",
      savedAt: "2026-06-27T22:10:00.000Z",
    });

    const after = localLoopRepository.getSnapshot();
    const savedCase = after.cases.find((caseSummary) => caseSummary.id === "case-maestro-local");

    expect(result.accepted).toBe(true);
    expect(result.caseSummary?.receiptNumber).toBe("YSC1234567890");
    expect(savedCase?.source).toBe("manual");
    expect(savedCase?.currentStatus).toBe("Receipt saved");
    expect(savedCase?.events).toHaveLength(1);
    expect(after.activeApplication).toEqual(beforeActiveApplication);
    expect(after.documents.map((document) => document.id)).toEqual(beforeDocumentIds);
  });

  test("rejects invalid manual case receipts without adding a case", () => {
    const beforeCaseIds = localLoopRepository.getSnapshot().cases.map((caseSummary) => caseSummary.id);

    const result = localLoopRepository.saveManualCaseReceipt({
      id: "case-invalid-local",
      receiptNumber: "IOE123",
      formCode: "I-765",
      savedAt: "2026-06-27T22:15:00.000Z",
    });

    expect(result).toEqual({
      accepted: false,
      normalizedReceiptNumber: "IOE123",
      error: "invalid_receipt",
    });
    expect(localLoopRepository.getSnapshot().cases.map((caseSummary) => caseSummary.id)).toEqual(
      beforeCaseIds,
    );
  });

  test("saves local reminder interactions without mutating filing drafts, deadlines, documents, or cases", () => {
    const before = localLoopRepository.getSnapshot();
    const beforeActiveApplication = before.activeApplication;
    const beforeDeadlines = before.deadlines;
    const beforeDocumentIds = before.documents.map((document) => document.id);
    const beforeCaseIds = before.cases.map((caseSummary) => caseSummary.id);

    const result = localLoopRepository.saveReminderInteraction({
      reminderId: "reminder-file-by-7-day",
      action: "acknowledge",
      actedAt: "2026-06-27T22:45:00.000Z",
    });

    const after = localLoopRepository.getSnapshot();
    const savedReminder = after.reminders?.find(
      (reminder) => reminder.id === "reminder-file-by-7-day",
    );

    expect(result.accepted).toBe(true);
    expect(result.reminder?.lastAction).toBe("acknowledged");
    expect(savedReminder?.lastActionAt).toBe("2026-06-27T22:45:00.000Z");
    expect(after.activeApplication).toEqual(beforeActiveApplication);
    expect(after.deadlines).toEqual(beforeDeadlines);
    expect(after.documents.map((document) => document.id)).toEqual(beforeDocumentIds);
    expect(after.cases.map((caseSummary) => caseSummary.id)).toEqual(beforeCaseIds);
  });

  test("rejects unknown reminder interactions without changing reminders", () => {
    const beforeReminders = localLoopRepository.getSnapshot().reminders;

    const result = localLoopRepository.saveReminderInteraction({
      reminderId: "missing-reminder",
      action: "snooze",
      actedAt: "2026-06-27T22:50:00.000Z",
      snoozeDays: 7,
    });

    expect(result).toEqual({
      accepted: false,
      error: "missing_reminder",
    });
    expect(localLoopRepository.getSnapshot().reminders).toEqual(beforeReminders);
  });

  test("saves forum reports without mutating filings, tracker cases, deadlines, documents, or profile", () => {
    const before = localLoopRepository.getSnapshot();
    const beforeActiveApplication = before.activeApplication;
    const beforeCases = before.cases;
    const beforeDeadlines = before.deadlines;
    const beforeDocuments = before.documents;
    const beforeProfile = before.profile;

    const result = localLoopRepository.saveForumReport({
      postId: "post-biometrics-1",
      reason: "unsafe_legal_advice",
      createdAt: "2026-06-27T23:05:00.000Z",
    });

    const after = localLoopRepository.getSnapshot();
    const savedReport = after.forum?.reports.find((report) => report.postId === "post-biometrics-1");

    expect(result.accepted).toBe(true);
    expect(result.report?.reasonLabel).toBe("Unsafe legal advice");
    expect(savedReport?.status).toBe("open");
    expect(after.activeApplication).toEqual(beforeActiveApplication);
    expect(after.cases).toEqual(beforeCases);
    expect(after.deadlines).toEqual(beforeDeadlines);
    expect(after.documents).toEqual(beforeDocuments);
    expect(after.profile).toEqual(beforeProfile);
  });

  test("blocks forum authors locally without touching profile identity", () => {
    const beforeProfile = localLoopRepository.getSnapshot().profile;

    const result = localLoopRepository.blockForumAuthor({
      authorPseudonymId: "author-safe",
    });

    const after = localLoopRepository.getSnapshot();

    expect(result).toEqual({
      accepted: true,
      blockedAuthorPseudonymIds: expect.arrayContaining(["author-safe"]),
    });
    expect(after.profile).toEqual(beforeProfile);
  });

  test("marks news items read without mutating filings, tracker cases, deadlines, documents, profile, or forum", () => {
    const before = localLoopRepository.getSnapshot();
    const beforeActiveApplication = before.activeApplication;
    const beforeCases = before.cases;
    const beforeDeadlines = before.deadlines;
    const beforeDocuments = before.documents;
    const beforeProfile = before.profile;
    const beforeForum = before.forum;

    const result = localLoopRepository.saveNewsItemRead({
      itemId: "news-uscis-all-news",
      openedAt: "2026-06-27T23:20:00.000Z",
    });

    const after = localLoopRepository.getSnapshot();
    const savedReceipt = after.news?.readReceipts.find(
      (receipt) => receipt.itemId === "news-uscis-all-news",
    );

    expect(result.accepted).toBe(true);
    expect(result.readReceipt).toEqual({
      itemId: "news-uscis-all-news",
      openedAt: "2026-06-27T23:20:00.000Z",
    });
    expect(savedReceipt?.openedAt).toBe("2026-06-27T23:20:00.000Z");
    expect(after.activeApplication).toEqual(beforeActiveApplication);
    expect(after.cases).toEqual(beforeCases);
    expect(after.deadlines).toEqual(beforeDeadlines);
    expect(after.documents).toEqual(beforeDocuments);
    expect(after.profile).toEqual(beforeProfile);
    expect(after.forum).toEqual(beforeForum);
  });

  test("rejects unknown news items without changing news read state", () => {
    const beforeNews = localLoopRepository.getSnapshot().news;

    const result = localLoopRepository.saveNewsItemRead({
      itemId: "missing-news-item",
      openedAt: "2026-06-27T23:25:00.000Z",
    });

    expect(result).toEqual({
      accepted: false,
      error: "missing_news_item",
    });
    expect(localLoopRepository.getSnapshot().news).toEqual(beforeNews);
  });
});
