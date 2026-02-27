import type { Address, AddressWithGeoPoint } from '../shared/address.domain';
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

export enum UserLevel {
  Basic = 'Basic',
  Buyer = 'Buyer',
  Seller = 'Seller',
  VerifiedSeller = 'VerifiedSeller',
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
 * Bank account information for payouts
 */
export interface BankAccount {
  holderName: string;
  iban: string;
  bic?: string;
  verified: boolean;
  verifiedAt?: Date;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  level: UserLevel;
  status: UserStatus;
  publicName: string;
  imageId: string;
  phone?: string;
  password: string;
  country: string;
  currency: CurrencyCode;
  address?: UserAddress;

  // Verification fields
  emailVerified: boolean;
  phoneVerified: boolean;

  // Terms of Service acceptance
  tosAcceptedAt?: Date;

  // Identity verification (for VerifiedSeller)
  identityVerification?: IdentityVerification;

  // Bank account (for sellers to receive payouts)
  bankAccount?: BankAccount;

  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublicInfo {
  id: string;
  publicName: string;
  pic: Image;
}

export interface AuthenticatedUserPublicInfo extends Omit<
  User,
  'password' | 'imageId'
> {
  pic: Image;
}

export interface LoginResponse {
  token: string;
  user: AuthenticatedUserPublicInfo;
  /** When true, frontend should redirect to OTP verification flow */
  requiresEmailVerification?: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  level: UserLevel;
}

export { Address, AddressWithGeoPoint } from '../shared/address.domain';
