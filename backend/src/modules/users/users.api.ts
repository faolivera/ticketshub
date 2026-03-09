import type { LoginResponse, PublicMeUser } from './users.domain';
import type { AcceptanceMethod } from '../terms/terms.domain';

export type { PublicMeUser };

/**
 * Request body for POST /users/login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Terms acceptance data included during registration
 */
export interface TermsAcceptanceData {
  termsVersionId: string;
  method: AcceptanceMethod;
}

/**
 * Request body for POST /users/register
 * country is optional; when omitted, backend uses default (Argentina).
 * phone is optional and not verified at registration.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country?: string;
  phone?: string;
  termsAcceptance: TermsAcceptanceData;
}

/**
 * Response data for POST /users/register (same shape as login - token + user)
 */
export type RegisterResponse = LoginResponse;

/**
 * Response data for POST /users/login
 */
export type { LoginResponse };

/**
 * Response data for PUT /users/upgrade-to-seller
 */
export type UpgradeToSellerResponse = PublicMeUser;

/**
 * Response data for POST /users/profile/avatar
 */
export type UploadAvatarResponse = PublicMeUser;

/**
 * Request body for PUT /users/bank-account (V4)
 */
export interface UpdateBankAccountRequest {
  holderName: string;
  cbuOrCvu: string;
  alias?: string;
}

/**
 * Response data for PUT /users/bank-account
 */
export type UpdateBankAccountResponse = PublicMeUser;

/**
 * Response data for GET /users/bank-account (current user's bank account for form)
 */
export interface GetBankAccountResponse {
  holderName: string;
  cbuOrCvu: string;
  alias?: string;
  verified: boolean;
  verifiedAt?: string;
}

/**
 * Request body for PATCH /admin/users/:userId/bank-account-status (admin only)
 */
export interface UpdateBankAccountStatusRequest {
  status: 'approved' | 'rejected';
}

/**
 * Response data for PATCH /admin/users/:userId/bank-account-status
 */
export type UpdateBankAccountStatusResponse = PublicMeUser;

/**
 * Full bank account data for admin verification (admin only)
 */
export interface AdminBankAccountItem {
  holderName: string;
  cbuOrCvu: string;
  alias?: string;
  verified: boolean;
  verifiedAt?: string;
}

/**
 * User with full bank account for admin list (GET /admin/bank-accounts)
 */
export interface AdminBankAccountVerificationItem {
  userId: string;
  userEmail: string;
  userPublicName: string;
  bankAccount: AdminBankAccountItem;
}

/**
 * Response for GET /admin/bank-accounts (admin only)
 */
export interface ListAdminBankAccountsResponse {
  items: AdminBankAccountVerificationItem[];
}
