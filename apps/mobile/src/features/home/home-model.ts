import {
  getDeadlineUrgency,
  getHomeStatus,
  getUpcomingDeadlines,
  type DeadlineSummary,
  type HomeStatus,
  type LoopSnapshot,
} from "@immigration/shared";

export interface HomeFormItem {
  id: string;
  title: string;
  detail: string;
  action: string;
}

export interface HomeSections {
  hero: HomeStatus;
  upcoming: DeadlineSummary[];
  forms: HomeFormItem[];
}

export function buildHomeSections(snapshot: LoopSnapshot, now = new Date()): HomeSections {
  const activeApplication = snapshot.activeApplication;
  const forms = activeApplication
    ? [
        {
          id: activeApplication.id,
          title: activeApplication.title,
          detail: `${activeApplication.currentStep} of ${activeApplication.totalSteps} steps complete`,
          action: activeApplication.status === "draft" ? "Continue" : "View",
        },
      ]
    : [];

  return {
    hero: getHomeStatus(snapshot, now),
    upcoming: getUpcomingDeadlines(snapshot.deadlines).slice(0, 3),
    forms,
  };
}

export function getDeadlineAccessibleSummary(deadline: DeadlineSummary, now = new Date()): string {
  const urgency = getDeadlineUrgency(deadline, now);
  return `${deadline.title}. ${urgency.label}. ${Math.abs(urgency.daysUntilDue)} days ${
    urgency.daysUntilDue < 0 ? "overdue" : "remaining"
  }.`;
}
