import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type { Notification } from '../notifications.domain';
import type {
  NotificationChannelProvider,
  ChannelSendResult,
} from './channel.interface';
import type { IEmailSender } from '../../../common/email/email-sender.interface';
import { EMAIL_SENDER } from '../../../common/email/email-sender.interface';
import { wrapEmailHtml } from '../../../common/email/email-wrapper';
import { UsersService } from '../../users/users.service';

const FALLBACK_PUBLIC_URL = 'https://www.ticketshub.com.ar';

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
    private readonly configService: ConfigService,
  ) {}

  private resolveBaseUrl(): string {
    const publicUrl = this.configService.get<string>('app.publicUrl') ?? '';
    if (!publicUrl || publicUrl.includes('localhost')) {
      return FALLBACK_PUBLIC_URL;
    }
    return publicUrl.replace(/\/$/, '');
  }

  /**
   * Replaces path-only actionUrl with a full URL in the rendered HTML body,
   * so email links are clickable. In-app notifications keep the relative path
   * for client-side navigation.
   */
  private buildHtmlBody(notification: Notification): string {
    let body = notification.body;
    if (notification.actionUrl) {
      const fullUrl = `${this.resolveBaseUrl()}${notification.actionUrl}`;
      body = body.replaceAll(notification.actionUrl, fullUrl);
    }
    return wrapEmailHtml(body);
  }

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
      htmlBody: this.buildHtmlBody(notification),
    });

    if (result.success) {
      return { success: true, externalId: result.messageId };
    }
    return { success: false, error: result.error };
  }
}
