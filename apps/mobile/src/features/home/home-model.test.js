import { describe, expect, test } from "bun:test";

import { buildHomeSections } from "./home-model.ts";

describe("Home loop model", () => {
  test("builds a status-first home surface from the local loop snapshot", () => {
    const sections = buildHomeSections(
      {
        activeApplication: {
          id: "app-1",
          typeCode: "I-765",
          title: "I-765 EAD renewal",
          status: "draft",
          currentStep: 4,
          totalSteps: 10,
          updatedAt: "2026-06-26T12:00:00.000Z",
        },
        applications: [],
        documents: [],
        cases: [],
        deadlines: [
          {
            id: "deadline-1",
            kind: "file_by",
            title: "File your EAD renewal",
            dueAt: "2026-07-15T12:00:00.000Z",
            status: "upcoming",
          },
        ],
      },
      new Date("2026-06-26T12:00:00.000Z")
    );

    expect(sections.hero.primaryAction).toBe("Continue draft");
    expect(sections.upcoming[0]?.title).toBe("File your EAD renewal");
    expect(sections.forms[0]).toEqual({
      id: "app-1",
      title: "I-765 EAD renewal",
      detail: "4 of 10 steps complete",
      action: "Continue",
    });
  });
});
