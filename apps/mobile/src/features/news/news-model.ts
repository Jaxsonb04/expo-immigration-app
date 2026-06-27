import {
  getNewsSafetyNotice,
  getNewsSourceKindLabel,
  getPublishedOfficialNewsItems,
  type NewsSafetyNotice,
  type NewsSnapshot,
} from "@immigration/shared";

export interface NewsSourceItem {
  id: string;
  title: string;
  detail: string;
  url: string;
  lastFetchedLabel: string;
}

export interface NewsFeedItem {
  id: string;
  title: string;
  summary: string;
  sourceLabel: string;
  publishedLabel: string;
  editorialLabel: string;
  tagLabels: string[];
  url: string;
  readLabel: string;
  openLabel: string;
  markReadLabel: string;
}

export interface NewsModel {
  safetyNotice: NewsSafetyNotice;
  sources: NewsSourceItem[];
  items: NewsFeedItem[];
}

function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function buildNewsModel(news?: NewsSnapshot): NewsModel {
  const readItemIds = new Set((news?.readReceipts ?? []).map((receipt) => receipt.itemId));

  return {
    safetyNotice: getNewsSafetyNotice(),
    sources: (news?.sources ?? [])
      .filter((source) => source.isActive)
      .map((source) => ({
        id: source.id,
        title: source.name,
        detail: getNewsSourceKindLabel(source.kind),
        url: source.url,
        lastFetchedLabel: source.lastFetchedAt
          ? `Checked ${formatLongDate(source.lastFetchedAt)}`
          : "Not checked yet",
      })),
    items: getPublishedOfficialNewsItems(news).map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      sourceLabel: `${item.sourceName} · ${item.sourceKindLabel}`,
      publishedLabel: `Published ${formatLongDate(item.publishedAt)}`,
      editorialLabel: item.editorialStatusLabel,
      tagLabels: item.tags,
      url: item.url,
      readLabel: readItemIds.has(item.id) ? "Read" : "Unread",
      openLabel: "Open official source",
      markReadLabel: "Mark read",
    })),
  };
}
