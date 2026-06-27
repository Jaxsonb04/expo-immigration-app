import type { DeadlineTone } from "./deadlines";

export type ReminderChannel = "push" | "email" | "in_app";
export type ReminderStatus = "scheduled" | "sent" | "failed" | "cancelled";
export type ReminderLocalAction = "acknowledged" | "snoozed";
export type ReminderDeliveryMode = "contract_only" | "sent";

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
