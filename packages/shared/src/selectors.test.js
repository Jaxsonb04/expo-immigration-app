import { describe, expect, test } from "bun:test";

import { createEmptyI765Draft } from "./forms/i765.ts";
import {
  getDeadlineUrgency,
  getHomeStatus,
  getUpcomingDeadlines,
  normalizeReceiptNumber,
  validateReceiptNumber,
} from "./selectors.ts";

const now = new Date("2026-06-26T12:00:00.000Z");

describe("Stage 6 loop selectors", () => {
  test("sorts upcoming deadlines and filters completed items", () => {
    const deadlines = [
      {
        id: "done",
        kind: "expiry",
        title: "Old EAD",
        dueAt: "2026-06-20T12:00:00.000Z",
        status: "done",
      },
      {
        id: "later",
        kind: "expiry",
        title: "EAD expires",
        dueAt: "2026-10-15T12:00:00.000Z",
        status: "upcoming",
      },
      {
        id: "soon",
        kind: "file_by",
        title: "File renewal",
        dueAt: "2026-07-15T12:00:00.000Z",
        status: "upcoming",
      },
    ];

    expect(getUpcomingDeadlines(deadlines).map((deadline) => deadline.id)).toEqual([
      "soon",
      "later",
    ]);
  });

  test("labels deadlines without relying on color alone", () => {
    expect(
      getDeadlineUrgency(
        {
          id: "soon",
          kind: "file_by",
          title: "File renewal",
          dueAt: "2026-07-15T12:00:00.000Z",
          status: "upcoming",
        },
        now
      )
    ).toEqual({
      label: "Due soon",
      tone: "warning",
      daysUntilDue: 19,
    });
  });

  test("derives the home hero from the next deadline", () => {
    const status = getHomeStatus(
      {
        activeApplication: {
          id: "app-1",
          typeCode: "I-765",
          title: "I-765 EAD renewal",
          status: "draft",
          currentStep: 3,
          totalSteps: 10,
          updatedAt: "2026-06-25T18:00:00.000Z",
        },
        deadlines: [
          {
            id: "file-by",
            kind: "file_by",
            title: "File your EAD renewal",
            dueAt: "2026-07-15T12:00:00.000Z",
            status: "upcoming",
          },
        ],
      },
      now
    );

    expect(status).toEqual({
      headline: "Renewal window is open",
      detail: "File your EAD renewal is due in 19 days.",
      tone: "warning",
      primaryAction: "Continue draft",
    });
  });

  test("validates manual USCIS receipt numbers", () => {
    expect(normalizeReceiptNumber(" ioe 123 456 7890 ")).toBe("IOE1234567890");
    expect(validateReceiptNumber("IOE1234567890")).toBe(true);
    expect(validateReceiptNumber("EAC1234567890")).toBe(true);
    expect(validateReceiptNumber("AAA1234567890")).toBe(false);
    expect(validateReceiptNumber("IOE123")).toBe(false);
  });

  test("creates an I-765 draft without auto-deciding legal judgment fields", () => {
    const draft = createEmptyI765Draft({
      id: "draft-1",
      createdAt: "2026-06-26T12:00:00.000Z",
    });

    expect(draft.typeCode).toBe("I-765");
    expect(draft.formEdition).toBe("08/21/25");
    expect(draft.status).toBe("draft");
    expect(draft.answers.reason).toBeUndefined();
    expect(draft.answers.eligibilityCategory).toBeUndefined();
  });
});
