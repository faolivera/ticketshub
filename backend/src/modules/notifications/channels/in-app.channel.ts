import { Injectable, Optional, Inject } from '@nestjs/common';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type { Notification } from '../notifications.domain';
import type {
  NotificationChannelProvider,
  ChannelSendResult,
} from './channel.interface';
import type { IRealtimeBroadcaster } from '../../../common/realtime';
import { REALTIME_BROADCASTER } from '../../realtime/realtime.module';
import { NOTIFICATION } from '../../../common/socket/socket.events';

/**
 * In-app notification channel.
 * Stores notifications in DB for fetch; also pushes to connected clients via socket when broadcaster is available.
 */
@Injectable()
export class InAppChannel implements NotificationChannelProvider {
  private readonly logger = new ContextLogger(InAppChannel.name);

  constructor(
    @Optional()
    @Inject(REALTIME_BROADCASTER)
    private readonly broadcaster: IRealtimeBroadcaster | null,
  ) {}

  async send(ctx: Ctx, notification: Notification): Promise<ChannelSendResult> {
    this.logger.debug(
      ctx,
      `In-app notification ${notification.id} delivered to user ${notification.recipientId}`,
    );

    if (this.broadcaster) {
      const payload = {
        id: notification.id,
        eventType: notification.eventType,
        title: notification.title,
        body: notification.body,
        actionUrl: notification.actionUrl,
        createdAt:
          notification.createdAt instanceof Date
            ? notification.createdAt.toISOString()
            : notification.createdAt,
        read: notification.read,
      };
      await this.broadcaster
        .emitToUser(notification.recipientId, NOTIFICATION, payload)
        .catch((err) => {
          this.logger.debug(
            ctx,
            `Realtime push failed for notification ${notification.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        });
    }

    return {
      success: true,
    };
  }
}
