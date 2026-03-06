/**
 * Identity verification status
 */
export type IdentityVerificationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Public (non-admin) verification summary returned by GET/POST my verification.
 * Excludes document storage keys, filenames, reviewer id; government ID is masked.
 */
export interface IdentityVerificationPublic {
  id: string;
  status: IdentityVerificationStatus;
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  /** Masked government ID (e.g. "••••••1234") */
  governmentIdNumber: string;
  submittedAt: string;
  reviewedAt?: string;
}

/**
 * Full identity verification request (admin list/detail only)
 */
export interface IdentityVerificationRequest {
  id: string;
  userId: string;
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  governmentIdNumber: string;
  documentFrontStorageKey: string;
  documentFrontFilename: string;
  documentBackStorageKey: string;
  documentBackFilename: string;
  selfieStorageKey: string;
  selfieFilename: string;
  status: IdentityVerificationStatus;
  adminNotes?: string;
  reviewedBy?: string;
  submittedAt: string;
  reviewedAt?: string;
}

/**
 * Response for getting current user's verification status
 */
export interface GetMyVerificationResponse {
  verification: IdentityVerificationPublic | null;
}

/**
 * Response after submitting verification
 */
export interface SubmitVerificationResponse {
  verification: IdentityVerificationPublic;
}

/**
 * Bank account summary for admin list (masked for privacy)
 */
export interface BankAccountSummary {
  verified: boolean;
  holderName?: string;
  cbuLast4?: string;
}

/**
 * Identity verification with user context (for admin list)
 */
export interface IdentityVerificationWithUser extends IdentityVerificationRequest {
  userEmail: string;
  userPublicName: string;
  /** Seller bank account summary for payout; from User.bankAccount */
  bankAccountSummary?: BankAccountSummary | null;
}

/**
 * Response for listing verifications (admin)
 */
export interface ListIdentityVerificationsResponse {
  verifications: IdentityVerificationWithUser[];
  total: number;
}
