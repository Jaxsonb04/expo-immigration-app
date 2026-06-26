/** Deadline kinds that drive the calendar + reminder pipeline. */
export type DeadlineKind =
  | "file_by"
  | "expiry"
  | "biometrics"
  | "rfe_response"
  | "interview"
  | "custom";

export type DeadlineStatus = "upcoming" | "done" | "dismissed" | "overdue";
export type DeadlineTone = "success" | "warning" | "danger" | "accent";

export interface DeadlineSummary {
  id: string;
  kind: DeadlineKind;
  title: string;
  dueAt: string;
  status: DeadlineStatus;
  applicationId?: string;
  caseId?: string;
  documentId?: string;
  notes?: string;
}

export interface DeadlineUrgency {
  label: string;
  tone: DeadlineTone;
  daysUntilDue: number;
}
