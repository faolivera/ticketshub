import { Injectable, Inject } from '@nestjs/common';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type { Notification } from '../notifications.domain';
import type {
  NotificationChannelProvider,
  ChannelSendResult,
} from './channel.interface';
import type { IEmailSender } from '../../../common/email/email-sender.interface';
import { EMAIL_SENDER } from '../../../common/email/email-sender.interface';
import { UsersService } from '../../users/users.service';

/**
 * Email notification channel. Uses configured email provider (SES or MOCK_EMAIL) via IEmailSender.
 */
@Injectable()
export class EmailChannel implements NotificationChannelProvider {
  private readonly logger = new ContextLogger(EmailChannel.name);

  constructor(
    @Inject(EMAIL_SENDER)
    private readonly emailSender: IEmailSender,
    private readonly usersService: UsersService,
  ) {}

  async send(ctx: Ctx, notification: Notification): Promise<ChannelSendResult> {
    const user = await this.usersService.findById(ctx, notification.recipientId);
    if (!user?.email) {
      this.logger.warn(
        ctx,
        `No email for recipient ${notification.recipientId}, skipping notification ${notification.id}`,
      );
      return { success: false, error: 'Recipient has no email' };
    }

    const result = await this.emailSender.send(ctx, {
      to: user.email,
      subject: notification.title,
      body: notification.body,
    });

    if (result.success) {
      return { success: true, externalId: result.messageId };
    }
    return { success: false, error: result.error };
  }
}
