import type { AddressWithGeoPoint, CurrencyCode, Image } from './common';

/**
 * User roles
 */
export enum Role {
  User = 'User',
  Admin = 'Admin',
}

/**
 * User verification levels
 */
export enum UserLevel {
  Basic = 'Basic',
  Buyer = 'Buyer',
  Seller = 'Seller',
  VerifiedSeller = 'VerifiedSeller',
}

/**
 * Profile types
 */
export type ProfileType = 'Customer' | 'Provider';

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
 * Bank account information
 */
export interface BankAccount {
  holderName: string;
  iban: string;
  bic?: string;
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
  level: UserLevel;
  publicName: string;
  imageId: string;
  phone?: string;
  profiles: ProfileType[];
  lastUsedProfile?: ProfileType;
  country: string;
  currency: CurrencyCode;
  address?: AddressWithGeoPoint;

  // Verification fields
  emailVerified: boolean;
  phoneVerified: boolean;

  // Terms of Service acceptance
  tosAcceptedAt?: Date;

  // Identity verification (for VerifiedSeller)
  identityVerification?: IdentityVerification;

  // Bank account (for sellers)
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
  pic: Image;
}

/**
 * Authenticated user info (returned after login)
 */
export interface AuthenticatedUserPublicInfo extends Omit<User, 'password' | 'imageId'> {
  pic: Image;
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
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
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
  level: UserLevel;
  profiles: ProfileType[];
}
