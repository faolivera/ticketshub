import type { Ctx } from '../../common/types/context';
import type {
  User,
  UserAddress,
  UserStatus,
  IdentityVerification,
  BankAccount,
  Language,
} from './users.domain';

/**
 * Data required to create a new user
 */
export type CreateUserData = Omit<
  User,
  'id' | 'country' | 'currency' | 'status'
> &
  Partial<Pick<User, 'country' | 'currency' | 'buyerDisputed'>> & {
    status?: UserStatus;
  };

/**
 * Data for updating basic user information
 */
export interface UpdateBasicInfoData {
  firstName?: string;
  lastName?: string;
  publicName?: string;
  address?: UserAddress;
  imageId?: string;
}

/**
 * Data for upgrading user to verified seller
 */
export interface VerifiedSellerIdentityData {
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  governmentIdNumber: string;
}

/**
 * Users repository interface
 */
export interface IUsersRepository {
  /**
   * Find user by ID
   */
  findById(ctx: Ctx, id: string): Promise<User | undefined>;

  /**
   * Find users by IDs
   */
  findByIds(ctx: Ctx, ids: string[]): Promise<User[]>;

  /**
   * Find user by email
   */
  findByEmail(ctx: Ctx, email: string): Promise<User | undefined>;

  /**
   * Find users by emails (batch). Emails are trimmed and lowercased for lookup.
   */
  findByEmails(ctx: Ctx, emails: string[]): Promise<User[]>;

  /**
   * Find user by Google sub (googleId)
   */
  findByGoogleId(ctx: Ctx, googleId: string): Promise<User | undefined>;

  /**
   * Link Google account to existing user (set googleId)
   */
  setGoogleId(ctx: Ctx, userId: string, googleId: string): Promise<User | undefined>;

  /**
   * Find users whose email contains the search term (case-insensitive).
   * Optional take param limits the number of rows fetched from the DB.
   */
  findByEmailContaining(ctx: Ctx, searchTerm: string, take?: number): Promise<User[]>;

  /**
   * Find users with pagination and optional search by name or email
   */
  findManyPaginated(
    ctx: Ctx,
    params: { page: number; limit: number; search?: string },
  ): Promise<{ users: User[]; total: number }>;

  /**
   * Get all admin users (users with Admin role)
   */
  getAdmins(ctx: Ctx): Promise<User[]>;

  /**
   * Add a new user
   */
  add(ctx: Ctx, user: CreateUserData): Promise<User>;

  /**
   * Update user email verification status
   */
  updateEmailVerified(
    ctx: Ctx,
    userId: string,
    emailVerified: boolean,
  ): Promise<User | undefined>;

  /**
   * Update user phone verification status
   */
  updatePhoneVerified(
    ctx: Ctx,
    userId: string,
    phoneVerified: boolean,
    phone?: string,
  ): Promise<User | undefined>;

  /**
   * Set user phone (e.g. before OTP verification). Does not set phoneVerified.
   */
  setPhone(ctx: Ctx, userId: string, phone: string): Promise<User | undefined>;

  /**
   * Update basic user information
   */
  updateBasicInfo(
    ctx: Ctx,
    userId: string,
    updates: UpdateBasicInfoData,
  ): Promise<User | undefined>;

  /**
   * Set accepted seller terms timestamp (user intent to sell)
   */
  setAcceptedSellerTermsAt(
    ctx: Ctx,
    userId: string,
    acceptedSellerTermsAt: Date,
  ): Promise<User | undefined>;

  /**
   * Update user identity verification data on approval (V3). Does not change level.
   * Optionally invalidate bank account (V4) if legal name changed.
   */
  updateIdentityVerificationApproved(
    ctx: Ctx,
    userId: string,
    identityData: VerifiedSellerIdentityData,
  ): Promise<User | undefined>;

  /**
   * Invalidate V4 (bank account verified = false). Used when V3 legal name changes.
   */
  invalidateBankAccountVerification(
    ctx: Ctx,
    userId: string,
  ): Promise<User | undefined>;

  /**
   * Update or set bank account data
   */
  updateBankAccount(
    ctx: Ctx,
    userId: string,
    bankAccount: User['bankAccount'],
  ): Promise<User | undefined>;

  /**
   * Find all users that have a bank account set (for admin list with full bank data).
   */
  findUsersWithBankAccount(ctx: Ctx): Promise<User[]>;

  /**
   * Set buyerDisputed to true (when user opens a dispute as buyer).
   */
  setBuyerDisputed(ctx: Ctx, userId: string): Promise<User | undefined>;

  /**
   * Update user fields allowed for admin (role, status, email, phone, emailVerified, phoneVerified, basicInfo).
   */
  updateForAdmin(
    ctx: Ctx,
    userId: string,
    data: UpdateUserForAdminData,
  ): Promise<User | undefined>;
}

/**
 * Data allowed for admin user update.
 * identityVerification and bankAccount are merged with existing data when provided.
 */
export interface UpdateUserForAdminData {
  firstName?: string;
  lastName?: string;
  publicName?: string;
  email?: string;
  role?: User['role'];
  status?: UserStatus;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  country?: string;
  currency?: User['currency'];
  language?: Language;
  tosAcceptedAt?: Date | null;
  acceptedSellerTermsAt?: Date | null;
  buyerDisputed?: boolean;
  identityVerification?: Partial<
    Pick<IdentityVerification, 'status' | 'rejectionReason' | 'reviewedAt'>
  >;
  bankAccount?: Partial<
    Pick<
      BankAccount,
      'holderName' | 'cbuOrCvu' | 'alias' | 'verified' | 'verifiedAt'
    >
  >;
}

/**
 * Injection token for IUsersRepository
 */
export const USERS_REPOSITORY = Symbol('IUsersRepository');
