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
 * Full user entity
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

  // Identity verification (V3)
  identityVerification?: IdentityVerification;

  // Bank account (V4, for sellers to receive payouts)
  bankAccount?: BankAccount;

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
 * Authenticated user info (returned after login)
 */
export interface AuthenticatedUserPublicInfo extends Omit<User, 'password' | 'imageId'> {
  /** User profile image; null when none set */
  pic: Image | null;
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
