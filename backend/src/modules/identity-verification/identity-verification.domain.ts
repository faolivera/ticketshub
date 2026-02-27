/**
 * Allowed MIME types for identity documents
 */
export type IdentityDocumentMimeType = 'image/png' | 'image/jpeg' | 'image/jpg';

/**
 * Status of an identity verification request
 */
export enum IdentityVerificationStatus {
  /** Verification submitted, awaiting admin review */
  Pending = 'pending',
  /** Verification approved by admin */
  Approved = 'approved',
  /** Verification rejected by admin */
  Rejected = 'rejected',
}

/**
 * Identity verification request entity
 */
export interface IdentityVerificationRequest {
  /** Unique identifier */
  id: string;

  /** User who submitted the verification */
  userId: string;

  /** Legal first name as appears on government ID */
  legalFirstName: string;

  /** Legal last name as appears on government ID */
  legalLastName: string;

  /** Date of birth (YYYY-MM-DD format) */
  dateOfBirth: string;

  /** Government ID number (DNI, passport, etc.) */
  governmentIdNumber: string;

  /** Storage key for front of ID document */
  documentFrontStorageKey: string;

  /** Original filename for front document */
  documentFrontFilename: string;

  /** Storage key for back of ID document */
  documentBackStorageKey: string;

  /** Original filename for back document */
  documentBackFilename: string;

  /** Current status */
  status: IdentityVerificationStatus;

  /** Admin notes (e.g., rejection reason) */
  adminNotes?: string;

  /** Admin who reviewed the verification */
  reviewedBy?: string;

  /** Timestamps */
  submittedAt: Date;
  reviewedAt?: Date;
}

/** Allowed MIME types constant */
export const ALLOWED_DOCUMENT_MIME_TYPES: IdentityDocumentMimeType[] = [
  'image/png',
  'image/jpeg',
  'image/jpg',
];

/** Maximum file size: 10MB */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
