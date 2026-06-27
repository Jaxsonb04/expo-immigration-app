import type { ApplicationSummary } from "./applications";
import type { CaseSummary } from "./cases";
import type { DeadlineSummary } from "./deadlines";
import type { DocumentMetadata } from "./documents";
import type { ForumSnapshot } from "./forum";
import type { NewsSnapshot } from "./news";
import type { ProfileSummary } from "./profile";
import type { ReminderSummary } from "./reminders";

export interface LoopSnapshot {
  profile?: ProfileSummary;
  activeApplication?: ApplicationSummary;
  applications?: ApplicationSummary[];
  documents?: DocumentMetadata[];
  cases?: CaseSummary[];
  deadlines: DeadlineSummary[];
  reminders?: ReminderSummary[];
  forum?: ForumSnapshot;
  news?: NewsSnapshot;
}

export interface HomeStatus {
  headline: string;
  detail: string;
  tone: "success" | "warning" | "danger" | "accent";
  primaryAction: string;
}
