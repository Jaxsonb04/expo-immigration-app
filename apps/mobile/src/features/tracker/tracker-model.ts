import type { CaseSummary } from "@immigration/shared";

export interface TrackerModel {
  sourceLabel: string;
  syncDisclaimer: string;
  receiptLabel: string;
}

export function buildTrackerModel(caseSummary: CaseSummary): TrackerModel {
  return {
    sourceLabel: caseSummary.source === "manual" ? "Manual updates" : "USCIS API",
    syncDisclaimer:
      caseSummary.source === "manual"
        ? "This tracker is not connected to USCIS live status. You control the updates."
        : "USCIS sync is experimental and degrades to manual updates.",
    receiptLabel: caseSummary.receiptNumber ?? "No receipt number",
  };
}
