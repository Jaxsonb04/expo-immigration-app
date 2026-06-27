import {
  getForumSafetyNotice,
  getModerationStatusLabel,
  getVisibleForumThreads,
  type ForumSafetyNotice,
  type ForumSnapshot,
} from "@immigration/shared";

export interface ForumCategoryItem {
  id: string;
  title: string;
  description?: string;
  threadCount: number;
}

export interface ForumThreadPreview {
  id: string;
  categoryTitle: string;
  authorLabel: string;
  authorPseudonymId: string;
  title: string;
  preview: string;
  statusLabel: string;
  replyCountLabel: string;
  reportPostId?: string;
  reportLabel: string;
  blockLabel: string;
}

export interface ForumModel {
  safetyNotice: ForumSafetyNotice;
  categories: ForumCategoryItem[];
  threads: ForumThreadPreview[];
}

export function buildForumModel(forum?: ForumSnapshot): ForumModel {
  const categories = forum?.categories ?? [];
  const posts = forum?.posts ?? [];
  const visibleThreads = getVisibleForumThreads(
    forum?.threads ?? [],
    forum?.blockedAuthorPseudonymIds ?? [],
  );

  const categoryTitles = new Map(categories.map((category) => [category.id, category.title]));
  const threadItems = visibleThreads
    .slice()
    .sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt))
    .map((thread) => {
      const firstVisiblePost = posts.find(
        (post) => post.threadId === thread.id && post.status === "visible",
      );

      return {
        id: thread.id,
        categoryTitle: categoryTitles.get(thread.categoryId) ?? "Community",
        authorLabel: thread.authorDisplayName,
        authorPseudonymId: thread.authorPseudonymId,
        title: thread.title,
        preview: firstVisiblePost?.body ?? thread.body ?? "No visible replies yet.",
        statusLabel: getModerationStatusLabel(thread.status),
        replyCountLabel: `${thread.replyCount} ${thread.replyCount === 1 ? "reply" : "replies"}`,
        reportPostId: firstVisiblePost?.id,
        reportLabel: "Report",
        blockLabel: "Block author",
      };
    });

  return {
    safetyNotice: getForumSafetyNotice(),
    categories: categories
      .filter((category) => category.isActive)
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((category) => ({
        id: category.id,
        title: category.title,
        description: category.description,
        threadCount: visibleThreads.filter((thread) => thread.categoryId === category.id).length,
      })),
    threads: threadItems,
  };
}
