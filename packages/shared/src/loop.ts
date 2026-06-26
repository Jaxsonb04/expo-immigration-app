import type { ApplicationSummary } from "./applications";
import type { CaseSummary } from "./cases";
import type { DeadlineSummary } from "./deadlines";
import type { DocumentMetadata } from "./documents";
import type { ProfileSummary } from "./profile";

export interface LoopSnapshot {
  profile?: ProfileSummary;
  activeApplication?: ApplicationSummary;
  applications?: ApplicationSummary[];
  documents?: DocumentMetadata[];
  cases?: CaseSummary[];
  deadlines: DeadlineSummary[];
}

export interface HomeStatus {
  headline: string;
  detail: string;
  tone: "success" | "warning" | "danger" | "accent";
  primaryAction: string;
}
