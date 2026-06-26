import { describe, expect, test } from "bun:test";

import { buildCalendarMonthCells, getCalendarMarkersForMonth } from "./calendar-model.ts";

describe("calendar month markers", () => {
  test("only marks deadlines inside the displayed month", () => {
    const markers = getCalendarMarkersForMonth(
      [
        {
          id: "july",
          kind: "file_by",
          title: "File renewal",
          dueAt: "2026-07-15T12:00:00.000Z",
          status: "upcoming",
        },
        {
          id: "october",
          kind: "expiry",
          title: "EAD expires",
          dueAt: "2026-10-15T12:00:00.000Z",
          status: "upcoming",
        },
      ],
      2026,
      6
    );

    expect(markers.has(15)).toBe(true);
    expect(markers.size).toBe(1);
  });

  test("builds real month cells without fake overflow dates", () => {
    const cells = buildCalendarMonthCells(2026, 6);
    const days = cells.map((cell) => cell.day).filter((day) => day !== null);

    expect(cells.length).toBe(35);
    expect(cells.slice(0, 3).map((cell) => cell.day)).toEqual([null, null, null]);
    expect(days.at(0)).toBe(1);
    expect(days.at(-1)).toBe(31);
    expect(days.includes(32)).toBe(false);
  });
});
