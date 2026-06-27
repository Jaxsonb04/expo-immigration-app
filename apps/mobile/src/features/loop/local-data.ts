import type { LoopSnapshot } from "@immigration/shared";
import { createEmptyI765Draft } from "@immigration/shared";

const activeDraft = createEmptyI765Draft({
  id: "i765-draft-local",
  createdAt: "2026-06-20T16:00:00.000Z",
});

activeDraft.currentStep = 4;
activeDraft.completionPercent = 40;
activeDraft.updatedAt = "2026-06-26T12:00:00.000Z";

export const localLoopSnapshot: LoopSnapshot = {
  profile: {
    displayName: "Welcome back",
    preferredLanguage: "en",
    hasReusableProfile: true,
    completionPercent: 68,
  },
  activeApplication: activeDraft,
  applications: [
    activeDraft,
    {
      id: "i765-previous-local",
      typeCode: "I-765",
      title: "I-765 EAD renewal",
      status: "submitted",
      currentStep: 10,
      totalSteps: 10,
      updatedAt: "2025-05-02T14:00:00.000Z",
      submittedAt: "2025-05-02T14:00:00.000Z",
      formEdition: "03/13/26",
      completionPercent: 100,
      answers: {},
    },
  ],
  documents: [
    {
      id: "doc-ead",
      docType: "ead",
      title: "Current EAD",
      expiryDate: "2026-10-15T12:00:00.000Z",
      status: "expiring_soon",
      notes: "Metadata only. No file is stored in v1.",
    },
    {
      id: "doc-passport",
      docType: "passport",
      title: "Passport",
      expiryDate: "2028-03-01T12:00:00.000Z",
      status: "current",
      notes: "Used for reminders and checklist context only.",
    },
  ],
  cases: [
    {
      id: "case-local",
      applicationId: "i765-previous-local",
      receiptNumber: "IOE1234567890",
      formCode: "I-765",
      currentStatus: "Case Was Received",
      currentStatusText:
        "You added this status manually. The app is not connected to USCIS live status.",
      source: "manual",
      lastUpdatedAt: "2026-06-24T18:00:00.000Z",
      events: [
        {
          id: "event-2",
          status: "Case Was Received",
          statusText: "USCIS received the application. Added manually.",
          occurredAt: "2026-06-24T18:00:00.000Z",
          source: "manual",
        },
        {
          id: "event-1",
          status: "PDF Exported",
          statusText: "You exported a user-verified PDF to file yourself.",
          occurredAt: "2026-06-20T16:00:00.000Z",
          source: "manual",
        },
      ],
    },
  ],
  deadlines: [
    {
      id: "deadline-file-by",
      kind: "file_by",
      title: "File your EAD renewal",
      dueAt: "2026-07-15T12:00:00.000Z",
      status: "upcoming",
      applicationId: "i765-draft-local",
      notes: "Based on the renewal window for the saved EAD expiry date.",
    },
    {
      id: "deadline-ead-expiry",
      kind: "expiry",
      title: "Current EAD expires",
      dueAt: "2026-10-15T12:00:00.000Z",
      status: "upcoming",
      documentId: "doc-ead",
    },
    {
      id: "deadline-check-status",
      kind: "custom",
      title: "Check case status",
      dueAt: "2026-07-22T12:00:00.000Z",
      status: "upcoming",
      caseId: "case-local",
    },
  ],
  reminders: [
    {
      id: "reminder-file-by-7-day",
      deadlineId: "deadline-file-by",
      remindAt: "2026-07-08T12:00:00.000Z",
      leadLabel: "7 days before",
      channel: "push",
      status: "scheduled",
    },
    {
      id: "reminder-check-status-7-day",
      deadlineId: "deadline-check-status",
      remindAt: "2026-07-15T12:00:00.000Z",
      leadLabel: "7 days before",
      channel: "push",
      status: "scheduled",
    },
    {
      id: "reminder-ead-expiry-30-day",
      deadlineId: "deadline-ead-expiry",
      remindAt: "2026-09-15T12:00:00.000Z",
      leadLabel: "30 days before",
      channel: "push",
      status: "scheduled",
    },
  ],
};
