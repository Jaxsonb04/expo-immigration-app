import { describe, expect, test } from "bun:test";

import {
  createForumReport,
  getForumSafetyNotice,
  getModerationStatusLabel,
  getReportReasonLabel,
  getVisibleForumThreads,
} from "./forum.ts";

const visibleThread = {
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
};

describe("forum safety helpers", () => {
  test("keeps community positioning pseudonymous, non-PII, and not legal advice", () => {
    expect(getForumSafetyNotice()).toEqual({
      title: "Peer support only",
      body:
        "Do not share A-numbers, receipt numbers, addresses, documents, or legal advice. Reports go to moderation review.",
    });
  });

  test("labels report reasons and moderation states for review surfaces", () => {
    expect(getReportReasonLabel("unsafe_legal_advice")).toBe("Unsafe legal advice");
    expect(getReportReasonLabel("pii")).toBe("Personal information");
    expect(getModerationStatusLabel("open")).toBe("Open for replies");
    expect(getModerationStatusLabel("locked")).toBe("Locked by moderators");
    expect(getModerationStatusLabel("hidden")).toBe("Hidden pending moderation");
  });

  test("creates post reports with one moderation target and no profile identifiers", () => {
    expect(
      createForumReport({
        id: "report-local-1",
        postId: "post-biometrics-1",
        reason: "unsafe_legal_advice",
        createdAt: "2026-06-27T22:55:00.000Z",
      }),
    ).toEqual({
      id: "report-local-1",
      postId: "post-biometrics-1",
      reason: "unsafe_legal_advice",
      reasonLabel: "Unsafe legal advice",
      status: "open",
      createdAt: "2026-06-27T22:55:00.000Z",
    });
  });

  test("rejects reports without exactly one thread or post target", () => {
    expect(
      createForumReport({
        id: "report-missing-target",
        reason: "abuse",
        createdAt: "2026-06-27T22:55:00.000Z",
      }),
    ).toBeUndefined();

    expect(
      createForumReport({
        id: "report-two-targets",
        threadId: "thread-biometrics",
        postId: "post-biometrics-1",
        reason: "abuse",
        createdAt: "2026-06-27T22:55:00.000Z",
      }),
    ).toBeUndefined();
  });

  test("hides moderated threads and threads from locally blocked pseudonymous authors", () => {
    const threads = [
      visibleThread,
      { ...visibleThread, id: "thread-hidden", authorPseudonymId: "author-hidden", status: "hidden" },
      { ...visibleThread, id: "thread-blocked", authorPseudonymId: "author-blocked" },
    ];

    expect(getVisibleForumThreads(threads, ["author-blocked"]).map((thread) => thread.id)).toEqual([
      "thread-biometrics",
    ]);
  });
});
