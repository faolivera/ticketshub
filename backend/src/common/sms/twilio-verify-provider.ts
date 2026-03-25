// Twilio is CommonJS; default import can be undefined at runtime (e.g. Nest build)
const twilioLib = require('twilio');
const twilio = (twilioLib.default ?? twilioLib) as (
  accountSid: string,
  authToken: string,
) => import('twilio').Twilio;

import { ContextLogger } from '../logger/context-logger';
import type { OutboundMetricsService } from '../metrics/outbound-metrics.service';
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

  constructor(
    config: TwilioVerifyProviderConfig,
    private readonly metrics?: OutboundMetricsService,
  ) {
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
          locale: 'es',
        });
      this.logger.debug(ctx, 'startVerification sent', { phone });
      this.metrics?.recordSmsSend('start_verification', true);
    } catch (error) {
      this.logger.error(ctx, 'Twilio startVerification failed', error);
      this.metrics?.recordSmsSend('start_verification', false);
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
      this.metrics?.recordSmsSend('check_verification', true);
      return approved;
    } catch (error) {
      this.logger.error(ctx, 'Twilio checkVerification failed', error);
      this.metrics?.recordSmsSend('check_verification', false);
      return false;
    }
  }
}
