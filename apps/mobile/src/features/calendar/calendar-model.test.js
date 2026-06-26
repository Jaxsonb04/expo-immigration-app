import { describe, expect, test } from "bun:test";

import { groupDeadlinesByDay } from "./calendar-model.ts";

describe("calendar model", () => {
  test("groups upcoming deadlines by date for the agenda", () => {
    const groups = groupDeadlinesByDay([
      {
        id: "first",
        kind: "file_by",
        title: "File renewal",
        dueAt: "2026-07-15T12:00:00.000Z",
        status: "upcoming",
      },
      {
        id: "second",
        kind: "expiry",
        title: "EAD expires",
        dueAt: "2026-07-15T20:00:00.000Z",
        status: "upcoming",
      },
    ]);

    expect(groups).toEqual([
      {
        key: "2026-07-15",
        label: "Wed, Jul 15",
        deadlines: [
          expect.objectContaining({ id: "first" }),
          expect.objectContaining({ id: "second" }),
        ],
      },
    ]);
  });
});
