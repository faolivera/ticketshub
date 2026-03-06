import type { AddressWithGeoPoint, CurrencyCode, Image } from './common';
import type { TermsAcceptanceData } from './terms';

/**
 * User roles
 */
export enum Role {
  User = 'User',
  Admin = 'Admin',
}

/**
 * Identity verification status
 */
export enum IdentityVerificationStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

/**
 * Identity verification data
 */
export interface IdentityVerification {
  status: IdentityVerificationStatus;
  documentUrls: string[];
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

/**
 * Bank account information (Argentina: CBU/CVU)
 */
export interface BankAccount {
  holderName: string;
  cbuOrCvu: string;
  alias?: string;
  verified: boolean;
  verifiedAt?: Date;
}

/**
 * Full user entity (internal/admin). Current user from API uses AuthenticatedUserPublicInfo with booleans only.
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  publicName: string;
  imageId: string;
  phone?: string;
  country: string;
  currency: CurrencyCode;
  address?: AddressWithGeoPoint;

  /** When set, user has accepted seller terms. Capability to sell requires V1+V2. */
  acceptedSellerTermsAt?: Date | null;

  // Verification fields (V1–V4)
  emailVerified: boolean;
  phoneVerified: boolean;

  // Terms of Service acceptance
  tosAcceptedAt?: Date;

  // Identity verification (V3) – only status booleans exposed in GET /me
  identityVerified?: boolean;
  bankDetailsVerified?: boolean;
  /** Identity verification state; present when GET /me includes it. */
  identityVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  /** Bank account state; present when GET /me includes it. */
  bankAccountStatus?: 'none' | 'pending' | 'approved';
  /** True when user has opened a dispute as buyer; profile shows identity row. */
  buyerDisputed?: boolean;
  /** Last 4 digits of CBU/CVU for profile display when user has bank account. */
  bankAccountLast4?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public user info (for display)
 */
export interface UserPublicInfo {
  id: string;
  publicName: string;
  /** User profile image; null when none set */
  pic: Image | null;
}

/**
 * Authenticated user info (GET /users/me, login, register).
 * Exposes only identityVerified and bankDetailsVerified, not full identityVerification or bankAccount.
 */
export interface AuthenticatedUserPublicInfo extends Omit<User, 'password' | 'imageId'> {
  /** User profile image; null when none set */
  pic: Image | null;
}

/**
 * Current user's bank account (GET /users/bank-account), for profile/bank-account form.
 */
export interface MyBankAccount {
  holderName: string;
  cbuOrCvu: string;
  alias?: string;
  verified: boolean;
  verifiedAt?: string;
}

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  user: AuthenticatedUserPublicInfo;
  /** When true, frontend should redirect to OTP verification flow */
  requiresEmailVerification?: boolean;
}

/**
 * Register request
 * country is optional; backend defaults to Argentina when omitted.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Optional; not verified at registration. */
  phone?: string;
  country?: string;
  termsAcceptance: TermsAcceptanceData;
}

/**
 * Register response (same shape as login)
 */
export type RegisterResponse = LoginResponse;

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  isSeller: boolean;
}

/**
 * Full bank account item for admin verification list (admin only).
 */
export interface AdminBankAccountItem {
  holderName: string;
  cbuOrCvu: string;
  alias?: string;
  verified: boolean;
  verifiedAt?: string;
}

/**
 * User with full bank account for admin list (GET /users/admin/bank-accounts).
 */
export interface AdminBankAccountVerificationItem {
  userId: string;
  userEmail: string;
  userPublicName: string;
  bankAccount: AdminBankAccountItem;
}

/**
 * Response for GET /users/admin/bank-accounts (admin only).
 */
export interface ListAdminBankAccountsResponse {
  items: AdminBankAccountVerificationItem[];
}
