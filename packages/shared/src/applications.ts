import type { I765DraftAnswers, I765FormEdition } from "./forms/i765";

/** Filing lifecycle status (mirrors applications.status in docs/DATA-MODEL.md). */
export type ApplicationStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "accepted"
  | "rfe"
  | "approved"
  | "denied"
  | "withdrawn";

/** v1 supported filing types. I-90 is deferred (see docs/DECISIONS.md, D2). */
export type ApplicationTypeCode = "I-765";

export interface ApplicationSummary {
  id: string;
  typeCode: ApplicationTypeCode;
  title: string;
  status: ApplicationStatus;
  currentStep: number;
  totalSteps: number;
  updatedAt: string;
  createdAt?: string;
  submittedAt?: string;
  renewsApplicationId?: string;
  formEdition?: I765FormEdition;
  completionPercent?: number;
  answers?: I765DraftAnswers;
}
