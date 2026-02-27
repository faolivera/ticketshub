/**
 * Identity verification status
 */
export type IdentityVerificationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Identity verification request entity
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
  verification: IdentityVerificationRequest | null;
}

/**
 * Response after submitting verification
 */
export interface SubmitVerificationResponse {
  verification: IdentityVerificationRequest;
}

/**
 * Identity verification with user context (for admin list)
 */
export interface IdentityVerificationWithUser extends IdentityVerificationRequest {
  userEmail: string;
  userPublicName: string;
}

/**
 * Response for listing verifications (admin)
 */
export interface ListIdentityVerificationsResponse {
  verifications: IdentityVerificationWithUser[];
  total: number;
}
