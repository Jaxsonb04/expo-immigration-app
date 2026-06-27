import { describe, expect, test } from "bun:test";

import { applyReminderAction, getReminderState } from "./reminders.ts";

const scheduledReminder = {
  id: "reminder-file-by-7-day",
  deadlineId: "deadline-file-by",
  remindAt: "2026-07-08T12:00:00.000Z",
  leadLabel: "7 days before",
  channel: "push",
  status: "scheduled",
};

describe("deadline reminder helpers", () => {
  test("labels scheduled, due, acknowledged, and snoozed reminder states without claiming push delivery", () => {
    expect(getReminderState(scheduledReminder, new Date("2026-06-27T12:00:00.000Z"))).toEqual({
      label: "Reminder planned",
      tone: "accent",
      isActionable: true,
      deliveryMode: "contract_only",
    });

    expect(getReminderState(scheduledReminder, new Date("2026-07-08T12:00:01.000Z"))).toEqual({
      label: "Reminder due",
      tone: "warning",
      isActionable: true,
      deliveryMode: "contract_only",
    });

    expect(
      getReminderState(
        {
          ...scheduledReminder,
          lastAction: "acknowledged",
          lastActionAt: "2026-06-27T22:30:00.000Z",
        },
        new Date("2026-06-27T22:31:00.000Z"),
      ),
    ).toEqual({
      label: "Reminder checked locally",
      tone: "success",
      isActionable: true,
      deliveryMode: "contract_only",
    });

    expect(
      getReminderState(
        {
          ...scheduledReminder,
          lastAction: "snoozed",
          lastActionAt: "2026-06-27T22:35:00.000Z",
          snoozedFromRemindAt: "2026-07-08T12:00:00.000Z",
          remindAt: "2026-07-15T12:00:00.000Z",
        },
        new Date("2026-06-27T22:36:00.000Z"),
      ),
    ).toEqual({
      label: "Reminder snoozed locally",
      tone: "accent",
      isActionable: true,
      deliveryMode: "contract_only",
    });
  });

  test("applies local acknowledge and snooze actions without changing the reminder channel", () => {
    expect(
      applyReminderAction(scheduledReminder, {
        action: "acknowledge",
        actedAt: "2026-06-27T22:30:00.000Z",
      }),
    ).toEqual({
      ...scheduledReminder,
      lastAction: "acknowledged",
      lastActionAt: "2026-06-27T22:30:00.000Z",
    });

    expect(
      applyReminderAction(scheduledReminder, {
        action: "snooze",
        actedAt: "2026-06-27T22:35:00.000Z",
        snoozeDays: 7,
      }),
    ).toEqual({
      ...scheduledReminder,
      remindAt: "2026-07-15T12:00:00.000Z",
      lastAction: "snoozed",
      lastActionAt: "2026-06-27T22:35:00.000Z",
      snoozedFromRemindAt: "2026-07-08T12:00:00.000Z",
    });
  });
});
