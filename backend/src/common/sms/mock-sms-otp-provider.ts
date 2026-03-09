import { ContextLogger } from '../logger/context-logger';
import type { Ctx } from '../types/context';
import type { ISmsOtpProvider } from './sms-otp-provider.interface';

/** Hardcoded code accepted by mock SMS provider for OTP verification (non-production). */
export const MOCK_SMS_OTP_CODE = '222222';

/**
 * Mock SMS OTP provider. Logs what would be sent; checkVerification accepts only the hardcoded code 222222.
 */
export class MockSmsOtpProvider implements ISmsOtpProvider {
  private readonly logger = new ContextLogger(MockSmsOtpProvider.name);

  async startVerification(ctx: Ctx, phone: string): Promise<void> {
    this.logger.log(
      ctx,
      `[MOCK_SMS] Would send SMS OTP to ${phone} (accepted code: ${MOCK_SMS_OTP_CODE})`,
    );
  }

  async checkVerification(
    _ctx: Ctx,
    _phone: string,
    code: string,
  ): Promise<boolean> {
    return code === MOCK_SMS_OTP_CODE;
  }
}
