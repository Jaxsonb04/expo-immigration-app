import { describe, expect, test } from "bun:test";

import { buildReminderPlanItems, groupDeadlinesByDay } from "./calendar-model.ts";

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

  test("builds reminder plan items from deadline-linked reminders without push delivery claims", () => {
    const items = buildReminderPlanItems(
      [
        {
          id: "deadline-file-by",
          kind: "file_by",
          title: "File renewal",
          dueAt: "2026-07-15T12:00:00.000Z",
          status: "upcoming",
        },
      ],
      [
        {
          id: "reminder-file-by-7-day",
          deadlineId: "deadline-file-by",
          remindAt: "2026-07-08T12:00:00.000Z",
          leadLabel: "7 days before",
          channel: "push",
          status: "scheduled",
        },
      ],
      new Date("2026-06-27T12:00:00.000Z"),
    );

    expect(items).toEqual([
      {
        id: "reminder-file-by-7-day",
        deadlineId: "deadline-file-by",
        reminderId: "reminder-file-by-7-day",
        title: "File renewal",
        statusLabel: "Reminder planned",
        detail:
          "7 days before · Wed, Jul 8. In-app reminders are the source of truth until production auth and device tokens enable push.",
        primaryActionLabel: "Acknowledge",
        secondaryActionLabel: "Snooze 7 days",
      },
    ]);
  });

  test("shows acknowledged and snoozed local reminder states", () => {
    const [acknowledgedItem, snoozedItem] = buildReminderPlanItems(
      [
        {
          id: "deadline-file-by",
          kind: "file_by",
          title: "File renewal",
          dueAt: "2026-07-15T12:00:00.000Z",
          status: "upcoming",
        },
        {
          id: "deadline-check-status",
          kind: "custom",
          title: "Check case status",
          dueAt: "2026-07-22T12:00:00.000Z",
          status: "upcoming",
        },
      ],
      [
        {
          id: "reminder-file-by-7-day",
          deadlineId: "deadline-file-by",
          remindAt: "2026-07-08T12:00:00.000Z",
          leadLabel: "7 days before",
          channel: "push",
          status: "scheduled",
          lastAction: "acknowledged",
          lastActionAt: "2026-06-27T22:30:00.000Z",
        },
        {
          id: "reminder-check-status",
          deadlineId: "deadline-check-status",
          remindAt: "2026-07-15T12:00:00.000Z",
          leadLabel: "7 days before",
          channel: "push",
          status: "scheduled",
          lastAction: "snoozed",
          lastActionAt: "2026-06-27T22:35:00.000Z",
          snoozedFromRemindAt: "2026-07-08T12:00:00.000Z",
        },
      ],
      new Date("2026-06-27T22:36:00.000Z"),
    );

    expect(acknowledgedItem?.statusLabel).toBe("Reminder checked locally");
    expect(acknowledgedItem?.detail).toContain("Checked locally.");
    expect(snoozedItem?.statusLabel).toBe("Reminder snoozed locally");
    expect(snoozedItem?.detail).toContain("Snoozed to Wed, Jul 15.");
  });
});
