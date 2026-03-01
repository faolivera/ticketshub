import type { Ctx } from '../../common/types/context';
import type { User, UserAddress, UserLevel, UserStatus } from './users.domain';

/**
 * Data required to create a new user
 */
export type CreateUserData = Omit<User, 'id' | 'country' | 'currency' | 'status'> &
  Partial<Pick<User, 'country' | 'currency'>> & { status?: UserStatus };

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
   * Get all sellers (users with Seller or VerifiedSeller level)
   */
  getSellers(ctx: Ctx): Promise<User[]>;

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
   * Update user level
   */
  updateLevel(
    ctx: Ctx,
    userId: string,
    level: UserLevel,
  ): Promise<User | undefined>;

  /**
   * Upgrade user to verified seller with identity verification data
   */
  updateToVerifiedSeller(
    ctx: Ctx,
    userId: string,
    identityData: VerifiedSellerIdentityData,
  ): Promise<User | undefined>;
}

/**
 * Injection token for IUsersRepository
 */
export const USERS_REPOSITORY = Symbol('IUsersRepository');
