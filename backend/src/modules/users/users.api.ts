import type { Image } from '../images/images.domain';
import type {
  LoginResponse,
  AuthenticatedUserPublicInfo,
} from './users.domain';
import type { AcceptanceMethod } from '../terms/terms.domain';

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
export type UpgradeToSellerResponse = AuthenticatedUserPublicInfo;

/**
 * Response data for POST /users/profile/avatar
 */
export type UploadAvatarResponse = AuthenticatedUserPublicInfo;

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
export type UpdateBankAccountResponse = AuthenticatedUserPublicInfo;
