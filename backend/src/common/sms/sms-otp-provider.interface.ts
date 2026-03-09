import type { Ctx } from '../types/context';

/**
 * Provider for SMS OTP: start a verification (sends code) and check the code.
 * - Twilio Verify: start sends via Twilio, check calls Twilio API.
 * - Mock: start only logs; check accepts hardcoded code 222222.
 */
export interface ISmsOtpProvider {
  /**
   * Start SMS verification (sends code to phone). For Twilio this calls Verify API; for mock it only logs.
   */
  startVerification(ctx: Ctx, phone: string): Promise<void>;

  /**
   * Check if the code is valid for the given phone.
   * Twilio: calls Verify API. Mock: returns true iff code === '222222'.
   */
  checkVerification(ctx: Ctx, phone: string, code: string): Promise<boolean>;
}

export const SMS_OTP_PROVIDER = Symbol('ISmsOtpProvider');
