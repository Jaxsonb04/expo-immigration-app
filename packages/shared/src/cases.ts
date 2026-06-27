import { normalizeReceiptNumber, validateReceiptNumber } from "./selectors";

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

export interface CreateManualCaseFromReceiptInput {
  id: string;
  applicationId?: string;
  receiptNumber: string;
  formCode: string;
  savedAt: string;
}

const MANUAL_RECEIPT_STATUS = "Receipt saved";
const MANUAL_RECEIPT_STATUS_TEXT =
  "You added this receipt manually. The app has not checked USCIS live status.";

export function createManualCaseFromReceipt({
  id,
  applicationId,
  receiptNumber,
  formCode,
  savedAt,
}: CreateManualCaseFromReceiptInput): CaseSummary | undefined {
  if (!validateReceiptNumber(receiptNumber)) {
    return undefined;
  }

  const normalizedReceiptNumber = normalizeReceiptNumber(receiptNumber);

  return {
    id,
    applicationId,
    receiptNumber: normalizedReceiptNumber,
    formCode,
    currentStatus: MANUAL_RECEIPT_STATUS,
    currentStatusText: MANUAL_RECEIPT_STATUS_TEXT,
    source: "manual",
    lastUpdatedAt: savedAt,
    events: [
      {
        id: `${id}-receipt-saved`,
        status: MANUAL_RECEIPT_STATUS,
        statusText: MANUAL_RECEIPT_STATUS_TEXT,
        occurredAt: savedAt,
        source: "manual",
      },
    ],
  };
}
