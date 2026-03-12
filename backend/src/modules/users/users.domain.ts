import type { AddressWithGeoPoint } from '../shared/address.domain';
import type { Image } from '../images/images.domain';
import type { CurrencyCode } from '../shared/money.domain';

export enum Role {
  User = 'User',
  Admin = 'Admin',
}

export enum UserStatus {
  Enabled = 'Enabled',
  Disabled = 'Disabled',
  Suspended = 'Suspended',
}

/**
 * Supported languages for user interface and notifications
 */
export enum Language {
  ES = 'es',
  EN = 'en',
}

/**
 * User address with geographic point
 */
export type UserAddress = AddressWithGeoPoint;

/**
 * Identity verification status
 */
export enum IdentityVerificationStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

/**
 * Identity verification data for VerifiedSeller level
 */
export interface IdentityVerification {
  status: IdentityVerificationStatus;
  /** Legal first name as appears on government ID */
  legalFirstName: string;
  /** Legal last name as appears on government ID */
  legalLastName: string;
  /** Date of birth (YYYY-MM-DD format) */
  dateOfBirth: string;
  /** Government ID number (DNI, passport, etc.) */
  governmentIdNumber: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

/**
 * Bank account information for payouts (Argentina: CBU/CVU)
 */
export interface BankAccount {
  /** Account holder full name; must match V3 legal name for verification */
  holderName: string;
  /** CBU (22 digits) or CVU (22 digits) */
  cbuOrCvu: string;
  /** Optional alias (e.g. Mercado Pago alias) */
  alias?: string;
  verified: boolean;
  verifiedAt?: Date;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  publicName: string;
  imageId: string;
  phone?: string;
  /** Null for Google-only users */
  password?: string;
  /** Google sub (unique per Google account); set when user signs in with Google */
  googleId?: string;
  country: string;
  currency: CurrencyCode;
  language: Language;
  address?: UserAddress;

  /** When set, user has accepted seller terms (intent to sell). Capability to sell requires V1+V2. */
  acceptedSellerTermsAt?: Date;

  // Verification fields (V1-V4)
  emailVerified: boolean;
  phoneVerified: boolean;

  // Terms of Service acceptance (buyer terms)
  tosAcceptedAt?: Date;

  // Identity verification (V3)
  identityVerification?: IdentityVerification;

  // Bank account (V4, for sellers to receive payouts)
  bankAccount?: BankAccount;

  /** Set to true when user opens a dispute as buyer; used to show identity verification on profile */
  buyerDisputed: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublicInfo {
  id: string;
  publicName: string;
  /** User profile image; null when none set */
  pic: Image | null;
}

export interface AuthenticatedUserPublicInfo extends Omit<
  User,
  'password' | 'imageId'
> {
  /** User profile image; null when none set */
  pic: Image | null;
}

/** Client-facing user shape: only identityVerified and bankDetailsVerified (GET /me, login, register). */
export type PublicMeUser = Omit<
  AuthenticatedUserPublicInfo,
  'identityVerification' | 'bankAccount'
> & {
  identityVerified: boolean;
  bankDetailsVerified: boolean;
  /** Identity verification state for seller flows; 'none' = never submitted, 'pending' = awaiting admin, 'approved'/'rejected' from request. */
  identityVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  /** Bank account state; 'none' = no account, 'pending' = submitted not approved, 'approved' = verified. */
  bankAccountStatus?: 'none' | 'pending' | 'approved';
  /** When true, user has opened a dispute as buyer; profile shows identity row for verification. */
  buyerDisputed: boolean;
  /** Last 4 digits of CBU/CVU for profile display when user has bank account; undefined otherwise. */
  bankAccountLast4?: string;
};

export interface LoginResponse {
  token: string;
  user: PublicMeUser;
  /** When true, frontend should redirect to OTP verification flow */
  requiresEmailVerification?: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  isSeller: boolean;
}

export { Address, AddressWithGeoPoint } from '../shared/address.domain';
