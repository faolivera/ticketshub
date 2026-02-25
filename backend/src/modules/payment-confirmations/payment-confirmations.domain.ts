/**
 * Allowed MIME types for payment confirmations
 */
export type PaymentConfirmationMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/jpg'
  | 'application/pdf';

/**
 * Status of a payment confirmation
 */
export enum PaymentConfirmationStatus {
  /** File uploaded, awaiting admin review */
  Pending = 'Pending',
  /** File reviewed and accepted by admin */
  Accepted = 'Accepted',
  /** File rejected by admin */
  Rejected = 'Rejected',
}

/**
 * Payment confirmation entity
 */
export interface PaymentConfirmation {
  /** Unique identifier */
  id: string;

  /** Transaction this confirmation belongs to */
  transactionId: string;

  /** User who uploaded the file (buyer) */
  uploadedBy: string;

  /** Storage key (filename in storage) */
  storageKey: string;

  /** Original filename from upload */
  originalFilename: string;

  /** MIME type of the file */
  contentType: PaymentConfirmationMimeType;

  /** File size in bytes */
  sizeBytes: number;

  /** Current status */
  status: PaymentConfirmationStatus;

  /** Admin notes (e.g., rejection reason) */
  adminNotes?: string;

  /** Admin who reviewed the file */
  reviewedBy?: string;

  /** Timestamps */
  createdAt: Date;
  reviewedAt?: Date;
}

/** Allowed MIME types constant */
export const ALLOWED_MIME_TYPES: PaymentConfirmationMimeType[] = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
];

/** Maximum file size: 10MB */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
