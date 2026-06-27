import { describe, expect, test } from "bun:test";

import { buildForumModel } from "./forum-model.ts";

describe("forum model", () => {
  test("builds a safety-first forum feed with report and block controls", () => {
    const model = buildForumModel({
      categories: [
        {
          id: "cat-i765",
          slug: "i765-renewals",
          title: "I-765 renewals",
          description: "Peer experiences for renewal timing.",
          sortOrder: 1,
          isActive: true,
        },
      ],
      threads: [
        {
          id: "thread-biometrics",
          categoryId: "cat-i765",
          authorDisplayName: "EAD renewer",
          authorPseudonymId: "author-safe",
          title: "What did you bring to biometrics?",
          body: "I brought the notice, photo ID, and my appointment letter.",
          status: "open",
          replyCount: 3,
          lastActivityAt: "2026-06-27T20:00:00.000Z",
          createdAt: "2026-06-27T18:00:00.000Z",
        },
      ],
      posts: [
        {
          id: "post-biometrics-1",
          threadId: "thread-biometrics",
          authorDisplayName: "EAD renewer",
          authorPseudonymId: "author-safe",
          body: "I brought the notice, photo ID, and my appointment letter.",
          status: "visible",
          createdAt: "2026-06-27T18:00:00.000Z",
        },
      ],
      reports: [],
      blockedAuthorPseudonymIds: [],
    });

    expect(model.safetyNotice.body).toContain("Do not share A-numbers");
    expect(model.safetyNotice.body).toContain("legal advice");
    expect(model.categories).toEqual([
      {
        id: "cat-i765",
        title: "I-765 renewals",
        description: "Peer experiences for renewal timing.",
        threadCount: 1,
      },
    ]);
    expect(model.threads).toEqual([
      {
        id: "thread-biometrics",
        categoryTitle: "I-765 renewals",
        authorLabel: "EAD renewer",
        authorPseudonymId: "author-safe",
        title: "What did you bring to biometrics?",
        preview: "I brought the notice, photo ID, and my appointment letter.",
        statusLabel: "Open for replies",
        replyCountLabel: "3 replies",
        reportPostId: "post-biometrics-1",
        reportLabel: "Report",
        blockLabel: "Block author",
      },
    ]);
  });

  test("filters blocked authors from the local forum model", () => {
    const model = buildForumModel({
      categories: [],
      threads: [
        {
          id: "thread-blocked",
          categoryId: "cat-i765",
          authorDisplayName: "Blocked user",
          authorPseudonymId: "author-blocked",
          title: "Hidden after block",
          status: "open",
          replyCount: 0,
          lastActivityAt: "2026-06-27T20:00:00.000Z",
          createdAt: "2026-06-27T18:00:00.000Z",
        },
      ],
      posts: [],
      reports: [],
      blockedAuthorPseudonymIds: ["author-blocked"],
    });

    expect(model.threads).toEqual([]);
  });
});
