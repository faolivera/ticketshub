import type { Ctx } from '../../common/types/context';
import type { User, UserAddress, UserStatus } from './users.domain';

/**
 * Data required to create a new user
 */
export type CreateUserData = Omit<User, 'id' | 'country' | 'currency' | 'status'> &
  Partial<Pick<User, 'country' | 'currency' | 'buyerDisputed'>> & { status?: UserStatus };

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
   * Get all users
   */
  getAll(ctx: Ctx): Promise<User[]>;

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
   * Find users whose email contains the search term (case-insensitive)
   */
  findByEmailContaining(ctx: Ctx, searchTerm: string): Promise<User[]>;

  /**
   * Get all sellers (users who have accepted seller terms)
   */
  getSellers(ctx: Ctx): Promise<User[]>;

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
  invalidateBankAccountVerification(ctx: Ctx, userId: string): Promise<User | undefined>;

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
}

/**
 * Injection token for IUsersRepository
 */
export const USERS_REPOSITORY = Symbol('IUsersRepository');
