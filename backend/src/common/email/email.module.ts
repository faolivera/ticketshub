import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IEmailSender } from './email-sender.interface';
import { EMAIL_SENDER } from './email-sender.interface';
import { SesEmailSender } from './ses-email-sender';
import { MockEmailSender } from './mock-email-sender';

const PROVIDER_AWS = 'AWS';
const PROVIDER_MOCK = 'MOCK_EMAIL';

/**
 * Global email module. Provides IEmailSender based on config.
 * Provider is read from notifications.emailProvider, with fallback to otp.emailProvider
 * so that setting only otp.emailProvider (e.g. for OTP testing) is enough.
 */
@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      useFactory: (configService: ConfigService): IEmailSender => {
        const provider =
          configService.get<string>('otp.emailProvider') ??
          configService.get<string>('notifications.emailProvider') ??
          PROVIDER_MOCK;

        if (provider === PROVIDER_AWS) {
          const region = configService.get<string>('ses.region');
          const accessKeyId = configService.get<string>('ses.accessKeyId');
          const secretAccessKey =
            configService.get<string>('ses.secretAccessKey');
          const fromEmail = configService.get<string>('ses.fromEmail');

          if (!region || !accessKeyId || !secretAccessKey || !fromEmail) {
            throw new Error(
              'SES config incomplete. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SES_FROM_EMAIL (or ses.* in config).',
            );
          }

          return new SesEmailSender({
            region,
            accessKeyId,
            secretAccessKey,
            fromEmail,
          });
        }

        return new MockEmailSender();
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_SENDER],
})
export class EmailModule {}
