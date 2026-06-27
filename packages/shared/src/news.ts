export type NewsSourceKind = "uscis_newsroom" | "uscis_developer_api" | "federal_register";
export type NewsEditorialStatus = "draft" | "needs_review" | "published";

export interface NewsSourceSummary {
  id: string;
  name: string;
  url: string;
  kind: NewsSourceKind;
  isActive: boolean;
  lastFetchedAt?: string;
}

export interface NewsItemSummary {
  id: string;
  sourceId: string;
  externalId?: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  publishedAt: string;
  fetchedAt?: string;
  isPublished: boolean;
  editorialStatus: NewsEditorialStatus;
}

export interface NewsReadReceiptSummary {
  itemId: string;
  openedAt: string;
}

export interface NewsSnapshot {
  sources: NewsSourceSummary[];
  items: NewsItemSummary[];
  readReceipts: NewsReadReceiptSummary[];
}

export interface NewsSafetyNotice {
  title: string;
  body: string;
}

export interface CreateNewsItemDraftInput {
  id: string;
  sourceId: string;
  externalId?: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  publishedAt: string;
  fetchedAt: string;
}

export interface PublishedNewsItem extends NewsItemSummary {
  sourceName: string;
  sourceUrl: string;
  sourceKindLabel: string;
  editorialStatusLabel: string;
}

const officialNewsHosts = new Set(["uscis.gov", "developer.uscis.gov", "federalregister.gov"]);

export function getNewsSafetyNotice(): NewsSafetyNotice {
  return {
    title: "Official sources only",
    body:
      "News cards summarize government sources for awareness. Verify details on the official source before acting.",
  };
}

export function getNewsSourceKindLabel(kind: NewsSourceKind): string {
  switch (kind) {
    case "uscis_newsroom":
      return "Official USCIS newsroom";
    case "uscis_developer_api":
      return "USCIS developer API";
    case "federal_register":
      return "Federal Register";
  }
}

export function getEditorialStatusLabel(status: NewsEditorialStatus): string {
  switch (status) {
    case "published":
      return "Editorially reviewed";
    case "needs_review":
      return "Needs editorial review";
    case "draft":
      return "Draft";
  }
}

export function isOfficialNewsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    return officialNewsHosts.has(host) || host.endsWith(".uscis.gov");
  } catch {
    return false;
  }
}

export function createNewsItemDraft(input: CreateNewsItemDraftInput): NewsItemSummary | undefined {
  if (!isOfficialNewsUrl(input.url)) {
    return undefined;
  }

  return {
    id: input.id,
    sourceId: input.sourceId,
    externalId: input.externalId,
    title: input.title,
    url: input.url,
    summary: input.summary,
    tags: input.tags,
    publishedAt: input.publishedAt,
    fetchedAt: input.fetchedAt,
    isPublished: false,
    editorialStatus: "needs_review",
  };
}

export function getPublishedOfficialNewsItems(snapshot?: NewsSnapshot): PublishedNewsItem[] {
  if (!snapshot) {
    return [];
  }

  const activeSources = new Map(
    snapshot.sources
      .filter((source) => source.isActive && isOfficialNewsUrl(source.url))
      .map((source) => [source.id, source]),
  );

  return snapshot.items
    .filter((item) => item.isPublished && item.editorialStatus === "published")
    .filter((item) => isOfficialNewsUrl(item.url) && activeSources.has(item.sourceId))
    .slice()
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
    .map((item) => {
      const source = activeSources.get(item.sourceId);
      if (!source) {
        throw new Error(`Missing active source for news item ${item.id}`);
      }

      return {
        ...item,
        sourceName: source.name,
        sourceUrl: source.url,
        sourceKindLabel: getNewsSourceKindLabel(source.kind),
        editorialStatusLabel: getEditorialStatusLabel(item.editorialStatus),
      };
    });
}
