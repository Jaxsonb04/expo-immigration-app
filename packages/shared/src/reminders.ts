import type { DeadlineTone } from "./deadlines";

export type ReminderChannel = "push" | "email" | "in_app";
export type ReminderStatus = "scheduled" | "sent" | "failed" | "cancelled";
export type ReminderLocalAction = "acknowledged" | "snoozed";
export type ReminderDeliveryMode = "contract_only" | "sent";
export type ReminderDispatchSkipReason =
  | "not_push"
  | "not_due"
  | "already_terminal"
  | "already_ticketed"
  | "locally_acknowledged"
  | "invalid_remind_at";

export const EXPO_PUSH_MAX_MESSAGES_PER_REQUEST = 100;
export const EXPO_PUSH_RECEIPT_CHECK_DELAY_MINUTES = 15;

export interface ReminderSummary {
  id: string;
  deadlineId: string;
  userId?: string;
  remindAt: string;
  leadLabel?: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  pushTicketId?: string;
  sentAt?: string;
  lastAction?: ReminderLocalAction;
  lastActionAt?: string;
  snoozedFromRemindAt?: string;
}

export interface ReminderState {
  label: string;
  tone: DeadlineTone;
  isActionable: boolean;
  deliveryMode: ReminderDeliveryMode;
}

export interface ApplyReminderActionInput {
  action: "acknowledge" | "snooze";
  actedAt: string;
  snoozeDays?: number;
}

export interface ReminderDispatchBatch {
  index: number;
  reminderIds: string[];
}

export interface ReminderDispatchSkip {
  reminderId: string;
  reason: ReminderDispatchSkipReason;
}

export interface ReminderDispatchPlan {
  maxMessagesPerBatch: typeof EXPO_PUSH_MAX_MESSAGES_PER_REQUEST;
  receiptCheckDelayMinutes: typeof EXPO_PUSH_RECEIPT_CHECK_DELAY_MINUTES;
  batches: ReminderDispatchBatch[];
  skipped: ReminderDispatchSkip[];
}

const DEFAULT_SNOOZE_DAYS = 7;

export function getReminderState(reminder: ReminderSummary, now = new Date()): ReminderState {
  if (reminder.status === "sent") {
    return {
      label: "Reminder sent",
      tone: "success",
      isActionable: false,
      deliveryMode: "sent",
    };
  }

  if (reminder.status === "cancelled") {
    return {
      label: "Reminder cancelled",
      tone: "danger",
      isActionable: false,
      deliveryMode: "contract_only",
    };
  }

  if (reminder.lastAction === "acknowledged") {
    return {
      label: "Reminder checked locally",
      tone: "success",
      isActionable: true,
      deliveryMode: "contract_only",
    };
  }

  if (reminder.lastAction === "snoozed") {
    return {
      label: "Reminder snoozed locally",
      tone: "accent",
      isActionable: true,
      deliveryMode: "contract_only",
    };
  }

  if (new Date(reminder.remindAt).getTime() <= now.getTime()) {
    return {
      label: "Reminder due",
      tone: "warning",
      isActionable: true,
      deliveryMode: "contract_only",
    };
  }

  return {
    label: "Reminder planned",
    tone: "accent",
    isActionable: true,
    deliveryMode: "contract_only",
  };
}

export function applyReminderAction(
  reminder: ReminderSummary,
  input: ApplyReminderActionInput
): ReminderSummary {
  if (input.action === "acknowledge") {
    return {
      ...reminder,
      lastAction: "acknowledged",
      lastActionAt: input.actedAt,
    };
  }

  const snoozeDays =
    Number.isFinite(input.snoozeDays) && input.snoozeDays
      ? Math.max(1, Math.trunc(input.snoozeDays))
      : DEFAULT_SNOOZE_DAYS;
  const nextRemindAt = new Date(reminder.remindAt);
  nextRemindAt.setUTCDate(nextRemindAt.getUTCDate() + snoozeDays);

  return {
    ...reminder,
    remindAt: nextRemindAt.toISOString(),
    lastAction: "snoozed",
    lastActionAt: input.actedAt,
    snoozedFromRemindAt: reminder.remindAt,
  };
}

function getReminderDispatchSkipReason(
  reminder: ReminderSummary,
  now: Date,
): ReminderDispatchSkipReason | undefined {
  if (reminder.channel !== "push") {
    return "not_push";
  }

  if (reminder.status === "sent" || reminder.status === "cancelled") {
    return "already_terminal";
  }

  if (reminder.pushTicketId) {
    return "already_ticketed";
  }

  if (reminder.lastAction === "acknowledged") {
    return "locally_acknowledged";
  }

  const remindAtMs = new Date(reminder.remindAt).getTime();

  if (!Number.isFinite(remindAtMs)) {
    return "invalid_remind_at";
  }

  if (remindAtMs > now.getTime()) {
    return "not_due";
  }

  return undefined;
}

export function buildReminderDispatchPlan(
  reminders: readonly ReminderSummary[],
  now = new Date(),
): ReminderDispatchPlan {
  const dueReminderIds: string[] = [];
  const skipped: ReminderDispatchSkip[] = [];

  for (const reminder of reminders) {
    const reason = getReminderDispatchSkipReason(reminder, now);

    if (reason) {
      skipped.push({ reminderId: reminder.id, reason });
      continue;
    }

    dueReminderIds.push(reminder.id);
  }

  const batches: ReminderDispatchBatch[] = [];

  for (let index = 0; index < dueReminderIds.length; index += EXPO_PUSH_MAX_MESSAGES_PER_REQUEST) {
    batches.push({
      index: batches.length,
      reminderIds: dueReminderIds.slice(index, index + EXPO_PUSH_MAX_MESSAGES_PER_REQUEST),
    });
  }

  return {
    maxMessagesPerBatch: EXPO_PUSH_MAX_MESSAGES_PER_REQUEST,
    receiptCheckDelayMinutes: EXPO_PUSH_RECEIPT_CHECK_DELAY_MINUTES,
    batches,
    skipped,
  };
}
