import type { DeadlineSummary, DeadlineUrgency } from "./deadlines";
import type { HomeStatus, LoopSnapshot } from "./loop";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECEIPT_PREFIXES = new Set(["IOE", "EAC", "WAC", "LIN", "SRC", "MSC", "NBC", "YSC"]);

export function normalizeReceiptNumber(receiptNumber: string): string {
  return receiptNumber.replace(/\s+/g, "").toUpperCase();
}

export function validateReceiptNumber(receiptNumber: string): boolean {
  const normalized = normalizeReceiptNumber(receiptNumber);
  const prefix = normalized.slice(0, 3);
  return RECEIPT_PREFIXES.has(prefix) && /^[A-Z]{3}\d{10}$/.test(normalized);
}

export function getUpcomingDeadlines(deadlines: DeadlineSummary[]): DeadlineSummary[] {
  return deadlines
    .filter((deadline) => deadline.status === "upcoming")
    .slice()
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export function getDeadlineUrgency(
  deadline: DeadlineSummary,
  now = new Date()
): DeadlineUrgency {
  const daysUntilDue = Math.ceil((new Date(deadline.dueAt).getTime() - now.getTime()) / DAY_MS);

  if (daysUntilDue < 0 || deadline.status === "overdue") {
    return { label: "Overdue", tone: "danger", daysUntilDue };
  }

  if (daysUntilDue <= 30) {
    return { label: "Due soon", tone: "warning", daysUntilDue };
  }

  return { label: "On track", tone: "success", daysUntilDue };
}

export function getHomeStatus(snapshot: LoopSnapshot, now = new Date()): HomeStatus {
  const [nextDeadline] = getUpcomingDeadlines(snapshot.deadlines);

  if (!nextDeadline) {
    return {
      headline: "No urgent deadlines",
      detail: "Add your EAD expiry date to see your renewal window.",
      tone: "accent",
      primaryAction: "Add EAD details",
    };
  }

  const urgency = getDeadlineUrgency(nextDeadline, now);
  const daysText =
    urgency.daysUntilDue === 0
      ? "today"
      : `in ${urgency.daysUntilDue} ${urgency.daysUntilDue === 1 ? "day" : "days"}`;

  return {
    headline: urgency.tone === "warning" ? "Renewal window is open" : urgency.label,
    detail: `${nextDeadline.title} is due ${daysText}.`,
    tone: urgency.tone,
    primaryAction: snapshot.activeApplication?.status === "draft" ? "Continue draft" : "Start renewal",
  };
}
