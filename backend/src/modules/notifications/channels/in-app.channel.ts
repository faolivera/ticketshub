import { Injectable } from '@nestjs/common';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type { Notification } from '../notifications.domain';
import type {
  NotificationChannelProvider,
  ChannelSendResult,
} from './channel.interface';

/**
 * In-app notification channel.
 * For in-app notifications, "sending" is essentially just marking them as delivered
 * since they're already stored in the database for the user to fetch.
 */
@Injectable()
export class InAppChannel implements NotificationChannelProvider {
  private readonly logger = new ContextLogger(InAppChannel.name);

  async send(ctx: Ctx, notification: Notification): Promise<ChannelSendResult> {
    this.logger.debug(
      ctx,
      `In-app notification ${notification.id} delivered to user ${notification.recipientId}`,
    );

    // In-app notifications are stored in DB and fetched by the user.
    // No external delivery needed - they're already "sent" by being stored.
    return {
      success: true,
    };
  }
}
