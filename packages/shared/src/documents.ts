export type DocumentType =
  | "passport"
  | "green_card"
  | "ead"
  | "i797_notice"
  | "visa"
  | "photo"
  | "birth_certificate"
  | "marriage_certificate"
  | "supporting"
  | "other";

export type DocumentStatus = "current" | "expiring_soon" | "expired" | "missing";

export interface DocumentMetadata {
  id: string;
  docType: DocumentType;
  title: string;
  expiryDate?: string;
  issuedDate?: string;
  status: DocumentStatus;
  notes?: string;
}
