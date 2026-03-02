import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import { NotificationsService } from './notifications.service';
import {
  INotificationsRepository,
  NOTIFICATIONS_REPOSITORY,
} from './notifications.repository.interface';
import { ProcessorRegistry } from './processors';
import { TemplateService } from './templates';
import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { UsersService } from '../users/users.service';
import type {
  NotificationEvent,
  Notification,
  NotificationChannelConfig,
} from './notifications.domain';
import {
  NotificationChannel,
  NotificationEventStatus,
  NotificationStatus,
} from './notifications.domain';

@Injectable()
export class NotificationsWorker {
  private readonly logger = new ContextLogger(NotificationsWorker.name);
  private readonly defaultLocale = 'es';

  constructor(
    private readonly service: NotificationsService,
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly repository: INotificationsRepository,
    private readonly processorRegistry: ProcessorRegistry,
    private readonly templateService: TemplateService,
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  /**
   * Process a single notification event that has already been claimed.
   * Assumes the event status is already PROCESSING.
   * 1. Find the processor for the event type
   * 2. Get recipients from the processor
   * 3. Get channel config
   * 4. For each recipient × enabled channel:
   *    - Get user's locale
   *    - Render template
   *    - Create notification
   *    - Send through channel (for EMAIL)
   */
  async processClaimedEvent(ctx: Ctx, event: NotificationEvent): Promise<void> {
    this.logger.log(ctx, `Processing claimed event: ${event.id} (${event.type})`);

    try {
      const processor = this.processorRegistry.getProcessor(event.type);
      if (!processor) {
        throw new Error(`No processor found for event type: ${event.type}`);
      }

      const channelConfig = await this.service.getChannelConfigForEvent(
        ctx,
        event.type,
      );
      if (!channelConfig) {
        this.logger.warn(ctx, `No channel config found for ${event.type}, skipping`);
        await this.service.markEventCompleted(ctx, event.id);
        return;
      }

      const recipients = await processor.getRecipients(ctx, event.context);
      if (recipients.length === 0) {
        this.logger.debug(ctx, `No recipients for event ${event.id}`);
        await this.service.markEventCompleted(ctx, event.id);
        return;
      }

      for (const recipient of recipients) {
        await this.processRecipient(
          ctx,
          event,
          recipient.userId,
          channelConfig,
          processor.getTemplateVariables(event.context, recipient.userId),
        );
      }

      await this.service.markEventCompleted(ctx, event.id);
      this.logger.log(ctx, `Successfully processed event ${event.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(ctx, `Failed to process event ${event.id}: ${errorMessage}`);
      await this.service.markEventFailed(ctx, event.id, errorMessage);
    }
  }

  /**
   * Process a single notification event (legacy method).
   * Attempts atomic claim before processing.
   */
  async processEvent(ctx: Ctx, event: NotificationEvent): Promise<void> {
    const claimed = await this.service.claimEvent(ctx, event.id);
    if (!claimed) {
      this.logger.debug(ctx, `Event ${event.id} already claimed by another worker`);
      return;
    }
    await this.processClaimedEvent(ctx, claimed);
  }

  private async processRecipient(
    ctx: Ctx,
    event: NotificationEvent,
    userId: string,
    channelConfig: NotificationChannelConfig,
    variables: Record<string, string>,
  ): Promise<void> {
    // Get user to determine locale
    const user = await this.usersService.findById(ctx, userId);
    const locale = user?.language || this.defaultLocale;

    // Process enabled channels
    const channels: NotificationChannel[] = [];
    if (channelConfig.inAppEnabled) {
      channels.push(NotificationChannel.IN_APP);
    }
    if (channelConfig.emailEnabled) {
      channels.push(NotificationChannel.EMAIL);
    }

    for (const channel of channels) {
      await this.processChannel(ctx, event, userId, channel, locale, variables);
    }
  }

  private async processChannel(
    ctx: Ctx,
    event: NotificationEvent,
    userId: string,
    channel: NotificationChannel,
    locale: string,
    variables: Record<string, string>,
  ): Promise<void> {
    // Render template
    const content = await this.templateService.renderContent(
      ctx,
      event.type,
      channel,
      locale,
      variables,
    );

    if (!content) {
      this.logger.warn(
        ctx,
        `No template found for ${event.type}/${channel}/${locale}, skipping`,
      );
      return;
    }

    // Create notification
    const notification = await this.service.createNotification(ctx, {
      eventId: event.id,
      eventType: event.type,
      recipientId: userId,
      channel,
      title: content.title,
      body: content.body,
      actionUrl: content.actionUrl,
    });

    this.logger.debug(ctx, `Created notification ${notification.id} for ${channel}`);

    // For in-app, notification is already "delivered" by being stored
    if (channel === NotificationChannel.IN_APP) {
      await this.inAppChannel.send(ctx, notification);
      // Already marked as DELIVERED in createNotification for IN_APP
    }

    // For email, we queue it for sending (handled by scheduler/sendPendingEmails)
    // The notification is created with PENDING status
  }

  /**
   * Send pending email notifications using atomic batch claiming.
   */
  async sendPendingEmails(ctx: Ctx): Promise<void> {
    const claimed = await this.service.claimPendingEmails(ctx, 10);
    if (claimed.length === 0) return;

    this.logger.log(ctx, `Sending ${claimed.length} claimed email notifications`);

    for (const notification of claimed) {
      await this.sendEmail(ctx, notification);
    }
  }

  /**
   * Retry failed email notifications using atomic per-notification claiming.
   */
  async retryFailedEmails(ctx: Ctx): Promise<void> {
    const retryable = await this.service.getRetryableEmailNotifications(ctx);
    if (retryable.length === 0) return;

    this.logger.log(ctx, `Found ${retryable.length} retryable email notifications`);

    for (const notification of retryable) {
      const claimed = await this.service.claimRetryableEmail(ctx, notification.id);
      if (!claimed) {
        this.logger.debug(ctx, `Notification ${notification.id} already claimed by another worker`);
        continue;
      }
      await this.sendEmail(ctx, claimed);
    }
  }

  private async sendEmail(ctx: Ctx, notification: Notification): Promise<void> {
    const result = await this.emailChannel.send(ctx, notification);

    if (result.success) {
      await this.service.markNotificationDelivered(ctx, notification.id);
      this.logger.debug(ctx, `Email notification ${notification.id} delivered`);
    } else {
      await this.service.markNotificationFailed(
        ctx,
        notification.id,
        result.error || 'Unknown error',
      );
      this.logger.warn(
        ctx,
        `Email notification ${notification.id} failed: ${result.error}`,
      );
    }
  }

  /**
   * Process all pending events with atomic claiming.
   */
  async processPendingEvents(ctx: Ctx): Promise<void> {
    const events = await this.service.getPendingEvents(ctx);
    if (events.length === 0) return;

    this.logger.log(ctx, `Processing ${events.length} pending notification events`);

    for (const event of events) {
      const claimed = await this.service.claimEvent(ctx, event.id);
      if (!claimed) {
        this.logger.debug(ctx, `Event ${event.id} already claimed by another worker`);
        continue;
      }
      await this.processClaimedEvent(ctx, claimed);
    }
  }
}
