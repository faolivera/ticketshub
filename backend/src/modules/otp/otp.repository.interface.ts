import type { Ctx } from '../../common/types/context';
import type { OTP, OTPStatus, OTPType } from './otp.domain';

/**
 * OTP repository interface
 */
export interface IOTPRepository {
  /**
   * Create a new OTP (destination is optional; used for send target and Twilio verify).
   */
  create(ctx: Ctx, otp: OTP): Promise<OTP>;

  /**
   * Find OTP by ID
   */
  findById(ctx: Ctx, id: string): Promise<OTP | undefined>;

  /**
   * Find latest pending OTP for a user and type
   */
  findLatestPendingByUserAndType(
    ctx: Ctx,
    userId: string,
    type: OTPType,
  ): Promise<OTP | undefined>;

  /**
   * Expire all pending OTPs for a user and type
   */
  expireAllPendingByUserAndType(
    ctx: Ctx,
    userId: string,
    type: OTPType,
  ): Promise<void>;

  /**
   * Update OTP status
   */
  updateStatus(
    ctx: Ctx,
    id: string,
    status: OTPStatus,
  ): Promise<OTP | undefined>;

  /**
   * Increment the failed attempts counter for an OTP
   */
  incrementAttempts(ctx: Ctx, id: string): Promise<void>;

  /**
   * Delete OTP by ID
   */
  delete(ctx: Ctx, id: string): Promise<void>;
}

/**
 * Injection token for IOTPRepository
 */
export const OTP_REPOSITORY = Symbol('IOTPRepository');
