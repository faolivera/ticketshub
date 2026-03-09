import twilio from 'twilio';
import { ContextLogger } from '../logger/context-logger';
import type { Ctx } from '../types/context';
import type { ISmsOtpProvider } from './sms-otp-provider.interface';

export interface TwilioVerifyProviderConfig {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
}

/**
 * SMS OTP provider using Twilio Verify API. Sends and verifies codes via Twilio.
 */
export class TwilioVerifyProvider implements ISmsOtpProvider {
  private readonly logger = new ContextLogger(TwilioVerifyProvider.name);
  private readonly client: ReturnType<typeof twilio>;
  private readonly verifyServiceSid: string;

  constructor(config: TwilioVerifyProviderConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.verifyServiceSid = config.verifyServiceSid;
  }

  async startVerification(ctx: Ctx, phone: string): Promise<void> {
    this.logger.debug(ctx, 'startVerification', { phone });

    try {
      await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          to: phone,
          channel: 'sms',
        });
      this.logger.debug(ctx, 'startVerification sent', { phone });
    } catch (error) {
      this.logger.error(ctx, 'Twilio startVerification failed', error);
      throw error;
    }
  }

  async checkVerification(
    ctx: Ctx,
    phone: string,
    code: string,
  ): Promise<boolean> {
    this.logger.debug(ctx, 'checkVerification', { phone });

    try {
      const check = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: phone,
          code,
        });
      const approved = check.status === 'approved';
      this.logger.debug(ctx, 'checkVerification result', {
        phone,
        status: check.status,
        approved,
      });
      return approved;
    } catch (error) {
      this.logger.error(ctx, 'Twilio checkVerification failed', error);
      return false;
    }
  }
}
