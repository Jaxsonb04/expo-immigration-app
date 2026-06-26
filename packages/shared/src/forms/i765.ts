import type { ApplicationSummary } from "../applications";

export type I765FormEdition = "03/13/26";
export type I765Reason = "initial" | "replacement" | "renewal";
export type I765EligibilityCategory = "c8" | "c9" | "c33";

export interface I765DraftAnswers {
  reason?: I765Reason;
  eligibilityCategory?: I765EligibilityCategory;
  reviewAcknowledged?: boolean;
}

export interface CreateEmptyI765DraftInput {
  id: string;
  createdAt: string;
}

export function createEmptyI765Draft({
  id,
  createdAt,
}: CreateEmptyI765DraftInput): ApplicationSummary {
  return {
    id,
    typeCode: "I-765",
    title: "I-765 EAD renewal",
    status: "draft",
    currentStep: 0,
    totalSteps: 10,
    createdAt,
    updatedAt: createdAt,
    formEdition: "03/13/26",
    completionPercent: 0,
    answers: {},
  };
}
