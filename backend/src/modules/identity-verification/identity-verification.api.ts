import type {
  IdentityVerificationRequest,
  IdentityVerificationStatus,
} from './identity-verification.domain';

/**
 * Request to submit identity verification (form data)
 * Note: This is sent as multipart/form-data, so all fields are strings
 */
export interface SubmitIdentityVerificationRequest {
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  governmentIdNumber: string;
}

/**
 * Response after submitting identity verification (public shape, no document keys)
 */
export interface SubmitIdentityVerificationResponse {
  verification: IdentityVerificationPublic;
}

/**
 * Public (non-admin) verification summary for GET my verification.
 * Excludes document storage keys, filenames, reviewer id, and full government ID.
 */
export interface IdentityVerificationPublic {
  id: string;
  status: IdentityVerificationRequest['status'];
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  /** Masked government ID (e.g. "••••••1234"); only last 4 digits exposed */
  governmentIdNumber: string;
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

/**
 * Request to update verification status (admin)
 */
export interface UpdateVerificationStatusRequest {
  status: 'approved' | 'rejected';
  adminNotes?: string;
}

/**
 * Response after updating verification status
 */
export type UpdateVerificationStatusResponse = IdentityVerificationRequest;

/**
 * Query parameters for listing verifications (admin)
 */
export interface ListVerificationsQuery {
  status?: IdentityVerificationStatus;
}
