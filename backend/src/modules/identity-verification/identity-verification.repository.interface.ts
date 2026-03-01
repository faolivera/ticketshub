import type { Ctx } from '../../common/types/context';
import type { IdentityVerificationRequest } from './identity-verification.domain';
import type { IdentityVerificationStatus } from './identity-verification.domain';

/**
 * Identity Verification Repository interface
 */
export interface IIdentityVerificationRepository {
  /**
   * Save or update a verification request
   */
  save(ctx: Ctx, verification: IdentityVerificationRequest): Promise<void>;

  /**
   * Find verification by ID
   */
  findById(
    ctx: Ctx,
    id: string,
  ): Promise<IdentityVerificationRequest | undefined>;

  /**
   * Find most recent verification by user ID
   */
  findByUserId(
    ctx: Ctx,
    userId: string,
  ): Promise<IdentityVerificationRequest | undefined>;

  /**
   * Find all verifications with optional status filter
   */
  findAll(
    ctx: Ctx,
    status?: IdentityVerificationStatus,
  ): Promise<IdentityVerificationRequest[]>;

  /**
   * Find all pending verifications
   */
  findAllPending(ctx: Ctx): Promise<IdentityVerificationRequest[]>;

  /**
   * Count pending verifications
   */
  countPending(ctx: Ctx): Promise<number>;
}

/**
 * Injection token for IIdentityVerificationRepository
 */
export const IDENTITY_VERIFICATION_REPOSITORY = Symbol(
  'IIdentityVerificationRepository',
);
