import { describe, expect, test } from "bun:test";

import {
  EXPO_PUSH_MAX_MESSAGES_PER_REQUEST,
  buildReminderDispatchPlan,
  applyReminderAction,
  getReminderState,
} from "./reminders.ts";

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

  test("builds an Expo-safe dispatch plan for due push reminders without exposing token data", () => {
    const dueReminders = Array.from({ length: EXPO_PUSH_MAX_MESSAGES_PER_REQUEST + 1 }, (_, index) => ({
      id: `due-push-${index + 1}`,
      deadlineId: `deadline-${index + 1}`,
      remindAt: "2026-07-08T12:00:00.000Z",
      channel: "push",
      status: "scheduled",
      userId: `user-${index + 1}`,
    }));
    const plan = buildReminderDispatchPlan(
      [
        ...dueReminders,
        {
          ...scheduledReminder,
          id: "future-push",
          remindAt: "2026-07-09T12:00:00.000Z",
        },
        {
          ...scheduledReminder,
          id: "email-reminder",
          channel: "email",
        },
        {
          ...scheduledReminder,
          id: "already-sent",
          status: "sent",
          sentAt: "2026-07-08T12:01:00.000Z",
        },
        {
          ...scheduledReminder,
          id: "already-ticketed",
          pushTicketId: "ExpoPushTicket[receipt-check-pending]",
        },
        {
          ...scheduledReminder,
          id: "locally-acknowledged",
          lastAction: "acknowledged",
          lastActionAt: "2026-07-08T11:00:00.000Z",
        },
      ],
      new Date("2026-07-08T12:00:01.000Z"),
    );

    expect(plan.maxMessagesPerBatch).toBe(100);
    expect(plan.receiptCheckDelayMinutes).toBe(15);
    expect(plan.batches).toHaveLength(2);
    expect(plan.batches[0].reminderIds).toHaveLength(100);
    expect(plan.batches[1].reminderIds).toEqual(["due-push-101"]);
    expect(plan.skipped).toEqual([
      { reminderId: "future-push", reason: "not_due" },
      { reminderId: "email-reminder", reason: "not_push" },
      { reminderId: "already-sent", reason: "already_terminal" },
      { reminderId: "already-ticketed", reason: "already_ticketed" },
      { reminderId: "locally-acknowledged", reason: "locally_acknowledged" },
    ]);
    expect(JSON.stringify(plan)).not.toContain("ExpoPushTicket");
    expect(JSON.stringify(plan)).not.toContain("user-1");
  });

  test("skips invalid reminder dates and treats snoozed reminders as due only after their new reminder time", () => {
    const plan = buildReminderDispatchPlan(
      [
        {
          ...scheduledReminder,
          id: "invalid-date",
          remindAt: "not-a-date",
        },
        {
          ...scheduledReminder,
          id: "snoozed-future",
          remindAt: "2026-07-15T12:00:00.000Z",
          lastAction: "snoozed",
          snoozedFromRemindAt: "2026-07-08T12:00:00.000Z",
        },
        {
          ...scheduledReminder,
          id: "snoozed-due",
          remindAt: "2026-07-08T11:59:00.000Z",
          lastAction: "snoozed",
          snoozedFromRemindAt: "2026-07-01T11:59:00.000Z",
        },
      ],
      new Date("2026-07-08T12:00:01.000Z"),
    );

    expect(plan.batches).toEqual([
      {
        index: 0,
        reminderIds: ["snoozed-due"],
      },
    ]);
    expect(plan.skipped).toEqual([
      { reminderId: "invalid-date", reason: "invalid_remind_at" },
      { reminderId: "snoozed-future", reason: "not_due" },
    ]);
  });
});
