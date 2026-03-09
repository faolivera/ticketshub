import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ISmsOtpProvider } from './sms-otp-provider.interface';
import { SMS_OTP_PROVIDER } from './sms-otp-provider.interface';
import { TwilioVerifyProvider } from './twilio-verify-provider';
import { MockSmsOtpProvider } from './mock-sms-otp-provider';

const PROVIDER_TWILIO = 'TWILIO';
const PROVIDER_MOCK = 'MOCK_SMS';

/**
 * Global SMS OTP module. Provides ISmsOtpProvider based on otp.smsProvider (TWILIO | MOCK_SMS).
 */
@Global()
@Module({
  providers: [
    {
      provide: SMS_OTP_PROVIDER,
      useFactory: (configService: ConfigService): ISmsOtpProvider => {
        const provider =
          configService.get<string>('otp.smsProvider') ?? PROVIDER_MOCK;

        if (provider === PROVIDER_TWILIO) {
          const accountSid = configService.get<string>('twilio.accountSid');
          const authToken = configService.get<string>('twilio.authToken');
          const verifyServiceSid = configService.get<string>(
            'twilio.verifyServiceSid',
          );

          if (!accountSid || !authToken || !verifyServiceSid) {
            throw new Error(
              'Twilio config incomplete. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID (or twilio.* in config).',
            );
          }

          return new TwilioVerifyProvider({
            accountSid,
            authToken,
            verifyServiceSid,
          });
        }

        return new MockSmsOtpProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [SMS_OTP_PROVIDER],
})
export class SmsModule {}
