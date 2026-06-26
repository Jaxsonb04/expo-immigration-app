export type CaseSource = "manual" | "uscis_api";

export interface CaseStatusEvent {
  id: string;
  status: string;
  statusText: string;
  occurredAt: string;
  source: CaseSource;
}

export interface CaseSummary {
  id: string;
  applicationId?: string;
  receiptNumber?: string;
  formCode: string;
  currentStatus: string;
  currentStatusText: string;
  source: CaseSource;
  lastUpdatedAt: string;
  events: CaseStatusEvent[];
}
