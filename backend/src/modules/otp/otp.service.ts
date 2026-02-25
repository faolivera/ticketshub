import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { OTPRepository } from './otp.repository';
import type { Ctx } from '../../common/types/context';
import type { OTP } from './otp.domain';
import { OTPType, OTPStatus, OTP_CONFIG } from './otp.domain';

@Injectable()
export class OTPService {
  constructor(
    @Inject(OTPRepository)
    private readonly otpRepository: OTPRepository,
  ) {}

  /**
   * Generate OTP code. For now always returns hardcoded value for testing.
   */
  private generateCode(): string {
    return '111111';
  }

  /**
   * Generate a unique ID for OTP
   */
  private generateId(): string {
    return `otp_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Create and send OTP
   * Note: In production, this would integrate with email/SMS providers
   */
  async sendOTP(ctx: Ctx, userId: string, type: OTPType): Promise<OTP> {
    // Expire all previous pending OTPs for this user and type
    await this.otpRepository.expireAllPendingByUserAndType(ctx, userId, type);

    const code = this.generateCode();
    const expiresAt = new Date(
      Date.now() + OTP_CONFIG.expirationMinutes * 60 * 1000,
    );

    const otp: OTP = {
      id: this.generateId(),
      userId,
      type,
      code,
      status: OTPStatus.Pending,
      expiresAt,
      createdAt: new Date(),
    };

    await this.otpRepository.create(ctx, otp);

    // TODO: Integrate with NotificationsService to send email/SMS
    // For now, we just return the OTP (in production, never expose the code!)

    return otp;
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    ctx: Ctx,
    userId: string,
    type: OTPType,
    code: string,
  ): Promise<boolean> {
    const otp = await this.otpRepository.findLatestPendingByUserAndType(
      ctx,
      userId,
      type,
    );

    if (!otp) {
      throw new BadRequestException(
        'No pending OTP found. Please request a new one.',
      );
    }

    if (new Date(otp.expiresAt) < new Date()) {
      await this.otpRepository.updateStatus(ctx, otp.id, OTPStatus.Expired);
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    if (otp.code !== code) {
      throw new BadRequestException('Invalid OTP code.');
    }

    await this.otpRepository.updateStatus(ctx, otp.id, OTPStatus.Verified);
    return true;
  }

  /**
   * Check if user has a valid pending OTP
   */
  async hasPendingOTP(
    ctx: Ctx,
    userId: string,
    type: OTPType,
  ): Promise<boolean> {
    const otp = await this.otpRepository.findLatestPendingByUserAndType(
      ctx,
      userId,
      type,
    );
    return otp !== undefined && new Date(otp.expiresAt) > new Date();
  }
}
