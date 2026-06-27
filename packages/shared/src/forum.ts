export type ForumThreadStatus = "open" | "locked" | "hidden" | "deleted";
export type ForumPostStatus = "visible" | "hidden" | "deleted";
export type ForumReportStatus = "open" | "reviewed" | "actioned";
export type ForumReportReason = "unsafe_legal_advice" | "pii" | "abuse" | "spam" | "other";

export interface ForumCategorySummary {
  id: string;
  slug: string;
  title: string;
  description?: string;
  applicationTypeCode?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ForumThreadSummary {
  id: string;
  categoryId: string;
  authorDisplayName: string;
  authorPseudonymId: string;
  title: string;
  body?: string;
  status: ForumThreadStatus;
  isPinned?: boolean;
  replyCount: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface ForumPostSummary {
  id: string;
  threadId: string;
  authorDisplayName: string;
  authorPseudonymId: string;
  parentPostId?: string;
  body: string;
  status: ForumPostStatus;
  createdAt: string;
}

export interface ForumReportSummary {
  id: string;
  threadId?: string;
  postId?: string;
  reason: ForumReportReason;
  reasonLabel: string;
  status: ForumReportStatus;
  createdAt: string;
}

export interface ForumSnapshot {
  categories: ForumCategorySummary[];
  threads: ForumThreadSummary[];
  posts: ForumPostSummary[];
  reports: ForumReportSummary[];
  blockedAuthorPseudonymIds: string[];
}

export interface ForumSafetyNotice {
  title: string;
  body: string;
}

export interface CreateForumReportInput {
  id: string;
  threadId?: string;
  postId?: string;
  reason: ForumReportReason;
  createdAt: string;
}

export function getForumSafetyNotice(): ForumSafetyNotice {
  return {
    title: "Peer support only",
    body:
      "Do not share A-numbers, receipt numbers, addresses, documents, or legal advice. Reports go to moderation review.",
  };
}

export function getReportReasonLabel(reason: ForumReportReason): string {
  switch (reason) {
    case "unsafe_legal_advice":
      return "Unsafe legal advice";
    case "pii":
      return "Personal information";
    case "abuse":
      return "Abuse or harassment";
    case "spam":
      return "Spam";
    case "other":
      return "Other";
  }
}

export function getModerationStatusLabel(status: ForumThreadStatus | ForumPostStatus | ForumReportStatus): string {
  switch (status) {
    case "open":
      return "Open for replies";
    case "locked":
      return "Locked by moderators";
    case "hidden":
      return "Hidden pending moderation";
    case "deleted":
      return "Removed by moderators";
    case "visible":
      return "Visible";
    case "reviewed":
      return "Reviewed by moderators";
    case "actioned":
      return "Actioned by moderators";
  }
}

export function createForumReport(input: CreateForumReportInput): ForumReportSummary | undefined {
  const targetCount = Number(Boolean(input.threadId)) + Number(Boolean(input.postId));

  if (targetCount !== 1) {
    return undefined;
  }

  const target = input.threadId ? { threadId: input.threadId } : { postId: input.postId };

  return {
    id: input.id,
    ...target,
    reason: input.reason,
    reasonLabel: getReportReasonLabel(input.reason),
    status: "open",
    createdAt: input.createdAt,
  };
}

export function getVisibleForumThreads(
  threads: readonly ForumThreadSummary[],
  blockedAuthorPseudonymIds: readonly string[] = [],
): ForumThreadSummary[] {
  const blockedAuthors = new Set(blockedAuthorPseudonymIds);

  return threads.filter(
    (thread) =>
      (thread.status === "open" || thread.status === "locked") &&
      !blockedAuthors.has(thread.authorPseudonymId),
  );
}
