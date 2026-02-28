import { Injectable } from '@nestjs/common';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type { Notification } from '../notifications.domain';
import type {
  NotificationChannelProvider,
  ChannelSendResult,
} from './channel.interface';

/**
 * Email notification channel using AWS SES.
 * Currently a mock implementation - production would integrate with actual SES SDK.
 */
@Injectable()
export class EmailChannel implements NotificationChannelProvider {
  private readonly logger = new ContextLogger(EmailChannel.name);

  // TODO: Inject SES client when integrating with AWS
  // private readonly sesClient: SESClient;

  async send(ctx: Ctx, notification: Notification): Promise<ChannelSendResult> {
    this.logger.log(
      ctx,
      `[MOCK] Sending email notification ${notification.id} to user ${notification.recipientId}`,
    );

    try {
      // TODO: Integrate with AWS SES
      // const command = new SendEmailCommand({
      //   Source: 'noreply@ticketshub.com',
      //   Destination: { ToAddresses: [recipientEmail] },
      //   Message: {
      //     Subject: { Data: notification.title },
      //     Body: { Text: { Data: notification.body } },
      //   },
      // });
      // const response = await this.sesClient.send(command);

      // Mock successful send
      const mockMessageId = `ses_${Date.now()}_${Math.random().toString(16).substring(2, 10)}`;

      this.logger.debug(
        ctx,
        `[MOCK] Email sent successfully. MessageId: ${mockMessageId}`,
      );

      return {
        success: true,
        externalId: mockMessageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        ctx,
        `Failed to send email notification ${notification.id}: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
