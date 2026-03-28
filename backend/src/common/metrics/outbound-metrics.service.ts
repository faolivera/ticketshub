import { Injectable } from '@nestjs/common';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import {
  METRIC_EMAIL_SENDS_TOTAL,
  METRIC_SMS_SENDS_TOTAL,
  METRIC_OTP_SENDS_TOTAL,
  METRIC_OTP_VERIFICATIONS_TOTAL,
} from './metrics.constants';

export type OtpVerificationResult = 'success' | 'invalid_code' | 'expired' | 'no_pending' | 'max_attempts';

/**
 * Service to record outbound communication metrics (email, SMS, OTP).
 * Injected into EmailModule, SmsModule, and OTPModule.
 */
@Injectable()
export class OutboundMetricsService {
  constructor(
    @InjectMetric(METRIC_EMAIL_SENDS_TOTAL)
    private readonly emailSendsTotal: Counter<string>,
    @InjectMetric(METRIC_SMS_SENDS_TOTAL)
    private readonly smsSendsTotal: Counter<string>,
    @InjectMetric(METRIC_OTP_SENDS_TOTAL)
    private readonly otpSendsTotal: Counter<string>,
    @InjectMetric(METRIC_OTP_VERIFICATIONS_TOTAL)
    private readonly otpVerificationsTotal: Counter<string>,
  ) {}

  recordEmailSend(success: boolean): void {
    this.emailSendsTotal.inc({ success: success ? 'true' : 'false' });
  }

  recordSmsSend(operation: 'start_verification' | 'check_verification', success: boolean): void {
    this.smsSendsTotal.inc({ operation, success: success ? 'true' : 'false' });
  }

  recordOtpSend(type: string, success: boolean): void {
    this.otpSendsTotal.inc({ type, success: success ? 'true' : 'false' });
  }

  recordOtpVerification(type: string, result: OtpVerificationResult): void {
    this.otpVerificationsTotal.inc({ type, result });
  }
}
