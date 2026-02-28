import type { Ctx } from '../../../common/types/context';
import type { Notification } from '../notifications.domain';

/**
 * Result of sending a notification through a channel
 */
export interface ChannelSendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

/**
 * Interface that all notification channels must implement
 */
export interface NotificationChannelProvider {
  /**
   * Send a notification through this channel
   */
  send(ctx: Ctx, notification: Notification): Promise<ChannelSendResult>;
}
