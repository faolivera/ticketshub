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
 * Response after submitting identity verification
 */
export interface SubmitIdentityVerificationResponse {
  verification: IdentityVerificationRequest;
}

/**
 * Response for getting current user's verification status
 */
export interface GetMyVerificationResponse {
  verification: IdentityVerificationRequest | null;
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
