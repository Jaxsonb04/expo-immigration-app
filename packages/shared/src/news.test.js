import { describe, expect, test } from "bun:test";

import {
  createNewsItemDraft,
  getEditorialStatusLabel,
  getNewsSafetyNotice,
  getNewsSourceKindLabel,
  getPublishedOfficialNewsItems,
  isOfficialNewsUrl,
} from "./news.ts";

const uscisSource = {
  id: "source-uscis-newsroom",
  name: "USCIS Newsroom",
  url: "https://www.uscis.gov/newsroom",
  kind: "uscis_newsroom",
  isActive: true,
  lastFetchedAt: "2026-06-27T22:15:00.000Z",
};

const federalRegisterSource = {
  id: "source-federal-register",
  name: "Federal Register USCIS notices",
  url: "https://www.federalregister.gov/agencies/u-s-citizenship-and-immigration-services",
  kind: "federal_register",
  isActive: true,
};

describe("news safety helpers", () => {
  test("keeps news positioned as official-source summaries that require verification", () => {
    expect(getNewsSafetyNotice()).toEqual({
      title: "Official sources only",
      body:
        "News cards summarize government sources for awareness. Verify details on the official source before acting.",
    });
  });

  test("labels source kinds and editorial states", () => {
    expect(getNewsSourceKindLabel("uscis_newsroom")).toBe("Official USCIS newsroom");
    expect(getNewsSourceKindLabel("uscis_developer_api")).toBe("USCIS developer API");
    expect(getNewsSourceKindLabel("federal_register")).toBe("Federal Register");
    expect(getEditorialStatusLabel("published")).toBe("Editorially reviewed");
    expect(getEditorialStatusLabel("needs_review")).toBe("Needs editorial review");
    expect(getEditorialStatusLabel("draft")).toBe("Draft");
  });

  test("allows only recognized government source URLs", () => {
    expect(isOfficialNewsUrl("https://www.uscis.gov/newsroom/alerts")).toBe(true);
    expect(isOfficialNewsUrl("https://developer.uscis.gov/apis")).toBe(true);
    expect(
      isOfficialNewsUrl(
        "https://www.federalregister.gov/agencies/u-s-citizenship-and-immigration-services",
      ),
    ).toBe(true);
    expect(isOfficialNewsUrl("https://example.com/immigration-rumor")).toBe(false);
  });

  test("returns published official items sorted by published date with source context", () => {
    const inactiveSource = { ...uscisSource, id: "source-inactive", isActive: false };
    const snapshot = {
      sources: [uscisSource, federalRegisterSource, inactiveSource],
      items: [
        {
          id: "news-older",
          sourceId: "source-federal-register",
          title: "Federal Register USCIS notices",
          url: "https://www.federalregister.gov/agencies/u-s-citizenship-and-immigration-services",
          summary: "Official Federal Register documents from USCIS.",
          tags: ["Federal Register", "USCIS"],
          publishedAt: "2026-05-07T12:00:00.000Z",
          isPublished: true,
          editorialStatus: "published",
        },
        {
          id: "news-newer",
          sourceId: "source-uscis-newsroom",
          title: "USCIS Newsroom: All News",
          url: "https://www.uscis.gov/newsroom/all-news",
          summary: "Official USCIS releases, alerts, and policy updates.",
          tags: ["USCIS", "official"],
          publishedAt: "2026-06-27T12:00:00.000Z",
          isPublished: true,
          editorialStatus: "published",
        },
        {
          id: "news-unpublished",
          sourceId: "source-uscis-newsroom",
          title: "Draft USCIS summary",
          url: "https://www.uscis.gov/newsroom/alerts",
          summary: "Waiting on editorial review.",
          tags: ["USCIS"],
          publishedAt: "2026-06-28T12:00:00.000Z",
          isPublished: false,
          editorialStatus: "needs_review",
        },
        {
          id: "news-unofficial",
          sourceId: "source-uscis-newsroom",
          title: "Unofficial rumor",
          url: "https://example.com/immigration-rumor",
          summary: "This should never enter the published feed.",
          tags: ["rumor"],
          publishedAt: "2026-06-29T12:00:00.000Z",
          isPublished: true,
          editorialStatus: "published",
        },
        {
          id: "news-inactive-source",
          sourceId: "source-inactive",
          title: "Inactive source item",
          url: "https://www.uscis.gov/newsroom/news-releases",
          summary: "Inactive sources are hidden.",
          tags: ["USCIS"],
          publishedAt: "2026-06-30T12:00:00.000Z",
          isPublished: true,
          editorialStatus: "published",
        },
      ],
      readReceipts: [],
    };

    expect(getPublishedOfficialNewsItems(snapshot).map((item) => item.id)).toEqual([
      "news-newer",
      "news-older",
    ]);
    expect(getPublishedOfficialNewsItems(snapshot)[0]).toMatchObject({
      sourceName: "USCIS Newsroom",
      sourceKindLabel: "Official USCIS newsroom",
      editorialStatusLabel: "Editorially reviewed",
    });
  });

  test("creates official-source drafts without auto-publishing", () => {
    expect(
      createNewsItemDraft({
        id: "news-draft",
        sourceId: "source-uscis-newsroom",
        title: "USCIS source draft",
        url: "https://www.uscis.gov/newsroom/alerts",
        summary: "Draft summary awaiting editorial review.",
        tags: ["USCIS"],
        publishedAt: "2026-06-27T12:00:00.000Z",
        fetchedAt: "2026-06-27T22:20:00.000Z",
      }),
    ).toEqual({
      id: "news-draft",
      sourceId: "source-uscis-newsroom",
      title: "USCIS source draft",
      url: "https://www.uscis.gov/newsroom/alerts",
      summary: "Draft summary awaiting editorial review.",
      tags: ["USCIS"],
      publishedAt: "2026-06-27T12:00:00.000Z",
      fetchedAt: "2026-06-27T22:20:00.000Z",
      isPublished: false,
      editorialStatus: "needs_review",
    });

    expect(
      createNewsItemDraft({
        id: "news-rumor",
        sourceId: "source-uscis-newsroom",
        title: "Rumor draft",
        url: "https://example.com/immigration-rumor",
        summary: "Unofficial source.",
        tags: ["rumor"],
        publishedAt: "2026-06-27T12:00:00.000Z",
        fetchedAt: "2026-06-27T22:20:00.000Z",
      }),
    ).toBeUndefined();
  });
});
