import { describe, expect, test } from "bun:test";

import { buildNewsModel } from "./news-model.ts";

describe("news model", () => {
  test("builds a source-attributed official news feed", () => {
    const model = buildNewsModel({
      sources: [
        {
          id: "source-uscis-newsroom",
          name: "USCIS Newsroom",
          url: "https://www.uscis.gov/newsroom",
          kind: "uscis_newsroom",
          isActive: true,
          lastFetchedAt: "2026-06-27T22:15:00.000Z",
        },
      ],
      items: [
        {
          id: "news-uscis-all-news",
          sourceId: "source-uscis-newsroom",
          title: "USCIS Newsroom: All News",
          url: "https://www.uscis.gov/newsroom/all-news",
          summary: "Official USCIS releases, alerts, and policy updates.",
          tags: ["USCIS", "official"],
          publishedAt: "2026-06-27T12:00:00.000Z",
          isPublished: true,
          editorialStatus: "published",
        },
      ],
      readReceipts: [],
    });

    expect(model.safetyNotice.body).toContain("Verify details on the official source");
    expect(model.sources).toEqual([
      {
        id: "source-uscis-newsroom",
        title: "USCIS Newsroom",
        detail: "Official USCIS newsroom",
        url: "https://www.uscis.gov/newsroom",
        lastFetchedLabel: "Checked Jun 27, 2026",
      },
    ]);
    expect(model.items).toEqual([
      {
        id: "news-uscis-all-news",
        title: "USCIS Newsroom: All News",
        summary: "Official USCIS releases, alerts, and policy updates.",
        sourceLabel: "USCIS Newsroom · Official USCIS newsroom",
        publishedLabel: "Published Jun 27, 2026",
        editorialLabel: "Editorially reviewed",
        tagLabels: ["USCIS", "official"],
        url: "https://www.uscis.gov/newsroom/all-news",
        readLabel: "Unread",
        openLabel: "Open official source",
        markReadLabel: "Mark read",
      },
    ]);
  });

  test("marks locally read items without changing source attribution", () => {
    const model = buildNewsModel({
      sources: [
        {
          id: "source-federal-register",
          name: "Federal Register USCIS notices",
          url: "https://www.federalregister.gov/agencies/u-s-citizenship-and-immigration-services",
          kind: "federal_register",
          isActive: true,
        },
      ],
      items: [
        {
          id: "news-federal-register",
          sourceId: "source-federal-register",
          title: "Federal Register USCIS notices",
          url: "https://www.federalregister.gov/agencies/u-s-citizenship-and-immigration-services",
          summary: "Official Federal Register documents from USCIS.",
          tags: ["Federal Register", "USCIS"],
          publishedAt: "2026-05-07T12:00:00.000Z",
          isPublished: true,
          editorialStatus: "published",
        },
      ],
      readReceipts: [{ itemId: "news-federal-register", openedAt: "2026-06-27T22:30:00.000Z" }],
    });

    expect(model.items[0]).toMatchObject({
      id: "news-federal-register",
      sourceLabel: "Federal Register USCIS notices · Federal Register",
      readLabel: "Read",
    });
  });
});
