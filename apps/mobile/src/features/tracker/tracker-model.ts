import type { CaseSummary } from "@immigration/shared";
import { normalizeReceiptNumber, validateReceiptNumber } from "@immigration/shared";

export interface TrackerModel {
  sourceLabel: string;
  syncDisclaimer: string;
  receiptLabel: string;
}

export interface ReceiptEntryModel {
  normalizedReceiptNumber: string;
  canSave: boolean;
  helperText?: string;
  errorText?: string;
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

export function buildReceiptEntryModel(receiptNumber: string): ReceiptEntryModel {
  const normalizedReceiptNumber = normalizeReceiptNumber(receiptNumber);

  if (normalizedReceiptNumber.length === 0) {
    return {
      normalizedReceiptNumber,
      canSave: false,
      helperText: "Enter the receipt from your USCIS notice. Updates stay manual in this build.",
    };
  }

  if (!validateReceiptNumber(receiptNumber)) {
    return {
      normalizedReceiptNumber,
      canSave: false,
      errorText: "Use 3 letters followed by 10 numbers.",
    };
  }

  return {
    normalizedReceiptNumber,
    canSave: true,
    helperText: `Preview receipt: ${normalizedReceiptNumber}`,
  };
}
