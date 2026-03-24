import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { INotificationsRepository } from './notifications.repository.interface';
import { NOTIFICATIONS_REPOSITORY } from './notifications.repository.interface';
import type {
  NotificationEvent,
  Notification,
  NotificationTemplate,
  NotificationChannelConfig,
} from './notifications.domain';
import {
  NotificationEventType,
  NotificationEventStatus,
  NotificationStatus,
  NotificationChannel,
  NotificationRecipientRole,
  generateNotificationEventId,
  generateNotificationId,
  generateNotificationTemplateId,
} from './notifications.domain';
import type { NotificationContextMap } from './notifications.contexts';
import type {
  GetNotificationsResponse,
  NotificationListItem,
  GetUnreadCountResponse,
  MarkAsReadResponse,
  MarkAllAsReadResponse,
  MarkAsReadBatchResponse,
  GetTemplatesResponse,
  UpdateTemplateRequest,
  CreateTemplateRequest,
  GetChannelConfigsResponse,
  UpdateChannelConfigRequest,
  GetEventsResponse,
  GetNotificationEventDetailResponse,
  PreviewTemplateResponse,
} from './notifications.api';
import { wrapEmailHtml } from '../../common/email/email-wrapper';

@Injectable()
export class NotificationsService {
  private readonly logger = new ContextLogger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly repository: INotificationsRepository,
    private readonly configService: ConfigService,
  ) {}

  // ==========================================================================
  // EVENT EMISSION (called by other services)
  // ==========================================================================

  /**
   * Emit a notification event. This creates the event in PENDING status
   * for the worker to process asynchronously.
   */
  async emit<T extends NotificationEventType>(
    ctx: Ctx,
    type: T,
    context: NotificationContextMap[T],
    triggeredBy?: string,
  ): Promise<NotificationEvent> {
    this.logger.log(ctx, `Emitting notification event: ${type}`);

    const event: NotificationEvent = {
      id: generateNotificationEventId(),
      type,
      context: context as unknown as Record<string, unknown>,
      triggeredBy,
      triggeredAt: new Date(),
      status: NotificationEventStatus.PENDING,
    };

    const created = await this.repository.createEvent(ctx, event);
    this.logger.log(ctx, `Created notification event: ${created.id}`);
    return created;
  }

  // ==========================================================================
  // USER-FACING API
  // ==========================================================================

  /**
   * Get paginated in-app notifications for a user
   */
  async getNotifications(
    ctx: Ctx,
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<GetNotificationsResponse> {
    this.logger.debug(
      ctx,
      `Getting notifications for user ${userId}, page=${page}, limit=${limit}, unreadOnly=${unreadOnly}`,
    );

    const { notifications, total } =
      await this.repository.findUserInAppNotifications(
        ctx,
        userId,
        page,
        limit,
        unreadOnly,
      );

    const unreadCount = await this.repository.countUnreadNotifications(
      ctx,
      userId,
    );

    const items: NotificationListItem[] = notifications.map((n) => ({
      id: n.id,
      eventType: n.eventType,
      title: n.title,
      body: n.body,
      actionUrl: n.actionUrl,
      read: n.read,
      createdAt: n.createdAt,
    }));

    return {
      notifications: items,
      total,
      unreadCount,
    };
  }

  /**
   * Get unread notification count for header badge
   */
  async getUnreadCount(
    ctx: Ctx,
    userId: string,
  ): Promise<GetUnreadCountResponse> {
    const count = await this.repository.countUnreadNotifications(ctx, userId);
    return { count };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    ctx: Ctx,
    userId: string,
    notificationId: string,
  ): Promise<MarkAsReadResponse> {
    const notification = await this.repository.findNotificationById(
      ctx,
      notificationId,
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.recipientId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    const now = new Date();
    const updated = await this.repository.updateNotification(
      ctx,
      notificationId,
      {
        read: true,
        readAt: now,
      },
    );

    if (!updated) {
      throw new NotFoundException('Notification not found');
    }

    return {
      id: updated.id,
      eventType: updated.eventType,
      title: updated.title,
      body: updated.body,
      actionUrl: updated.actionUrl,
      read: updated.read,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Mark multiple notifications as read (e.g. when user opens the dropdown)
   */
  async markAsReadBatch(
    ctx: Ctx,
    userId: string,
    notificationIds: string[],
  ): Promise<MarkAsReadBatchResponse> {
    const uniqueIds = [...new Set(notificationIds)].filter(Boolean);
    if (uniqueIds.length === 0) {
      return { markedCount: 0 };
    }
    const markedCount = await this.repository.markAsReadBatch(
      ctx,
      userId,
      uniqueIds,
    );
    return { markedCount };
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(
    ctx: Ctx,
    userId: string,
  ): Promise<MarkAllAsReadResponse> {
    const markedCount = await this.repository.markAllAsRead(ctx, userId);
    this.logger.log(
      ctx,
      `Marked ${markedCount} notifications as read for user ${userId}`,
    );
    return { markedCount };
  }

  // ==========================================================================
  // ADMIN - TEMPLATES
  // ==========================================================================

  /**
   * Get all notification templates
   */
  async getAllTemplates(ctx: Ctx): Promise<GetTemplatesResponse> {
    const templates = await this.repository.findAllTemplates(ctx);
    return { templates };
  }

  /**
   * Get a template by ID
   */
  async getTemplateById(ctx: Ctx, id: string): Promise<NotificationTemplate> {
    const template = await this.repository.findTemplateById(ctx, id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  /**
   * Create a new template
   */
  async createTemplate(
    ctx: Ctx,
    data: CreateTemplateRequest,
    adminId: string,
  ): Promise<NotificationTemplate> {
    const template: NotificationTemplate = {
      id: generateNotificationTemplateId(),
      eventType: data.eventType,
      channel: data.channel as NotificationChannel,
      locale: data.locale,
      recipientRole: data.recipientRole,
      titleTemplate: data.titleTemplate,
      bodyTemplate: data.bodyTemplate,
      actionUrlTemplate: data.actionUrlTemplate,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: adminId,
    };

    return await this.repository.createTemplate(ctx, template);
  }

  /**
   * Get a full HTML preview of an email template (variables are not replaced).
   */
  async getTemplatePreview(ctx: Ctx, id: string): Promise<PreviewTemplateResponse> {
    const template = await this.repository.findTemplateById(ctx, id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return { html: wrapEmailHtml(template.bodyTemplate) };
  }

  /**
   * Update a template
   */
  async updateTemplate(
    ctx: Ctx,
    id: string,
    data: UpdateTemplateRequest,
    adminId: string,
  ): Promise<NotificationTemplate> {
    const updated = await this.repository.updateTemplate(ctx, id, {
      titleTemplate: data.titleTemplate,
      bodyTemplate: data.bodyTemplate,
      actionUrlTemplate: data.actionUrlTemplate,
      isActive: data.isActive,
      updatedBy: adminId,
    });

    if (!updated) {
      throw new NotFoundException('Template not found');
    }

    return updated;
  }

  // ==========================================================================
  // ADMIN - CHANNEL CONFIG
  // ==========================================================================

  /**
   * Get all channel configs
   */
  async getAllChannelConfigs(ctx: Ctx): Promise<GetChannelConfigsResponse> {
    const configs = await this.repository.findAllChannelConfigs(ctx);
    return { configs };
  }

  /**
   * Get full event type detail: channel config + templates grouped by role.
   * Used by the admin detail page.
   */
  async getNotificationEventDetail(
    ctx: Ctx,
    eventType: NotificationEventType,
  ): Promise<GetNotificationEventDetailResponse> {
    const [channelConfig, templates] = await Promise.all([
      this.repository.findChannelConfig(ctx, eventType),
      this.repository.findTemplatesByEventType(ctx, eventType),
    ]);

    if (!channelConfig) {
      throw new NotFoundException('Channel config not found');
    }

    const templatesByRole: GetNotificationEventDetailResponse['templatesByRole'] =
      {};
    for (const template of templates) {
      const role = template.recipientRole;
      if (!templatesByRole[role]) {
        templatesByRole[role] = { role, templates: [] };
      }
      templatesByRole[role]!.templates.push(template);
    }

    return { eventType, channelConfig, templatesByRole };
  }

  /**
   * Get channel config for an event type
   */
  async getChannelConfig(
    ctx: Ctx,
    eventType: NotificationEventType,
  ): Promise<NotificationChannelConfig> {
    const config = await this.repository.findChannelConfig(ctx, eventType);
    if (!config) {
      throw new NotFoundException('Channel config not found');
    }
    return config;
  }

  /**
   * Update channel config for an event type
   */
  async updateChannelConfig(
    ctx: Ctx,
    eventType: NotificationEventType,
    data: UpdateChannelConfigRequest,
    adminId: string,
  ): Promise<NotificationChannelConfig> {
    const updated = await this.repository.updateChannelConfig(ctx, eventType, {
      inAppEnabled: data.inAppEnabled,
      emailEnabled: data.emailEnabled,
      priority: data.priority,
      updatedBy: adminId,
    });

    if (!updated) {
      throw new NotFoundException('Channel config not found');
    }

    return updated;
  }

  // ==========================================================================
  // ADMIN - EVENTS (AUDIT)
  // ==========================================================================

  /**
   * Get paginated notification events for audit
   */
  async getEvents(
    ctx: Ctx,
    page: number = 1,
    limit: number = 20,
    filters?: {
      type?: NotificationEventType;
      status?: NotificationEventStatus;
      from?: string;
      to?: string;
    },
  ): Promise<GetEventsResponse> {
    const parsedFilters = filters
      ? {
          type: filters.type,
          status: filters.status,
          from: filters.from ? new Date(filters.from) : undefined,
          to: filters.to ? new Date(filters.to) : undefined,
        }
      : undefined;

    const { events, total } = await this.repository.getEventsPaginated(
      ctx,
      page,
      limit,
      parsedFilters,
    );

    return { events, total };
  }

  /**
   * Get a specific event by ID
   */
  async getEventById(ctx: Ctx, id: string): Promise<NotificationEvent> {
    const event = await this.repository.findEventById(ctx, id);
    if (!event) {
      throw new NotFoundException('Notification event not found');
    }
    return event;
  }

  /**
   * Get notifications created from an event
   */
  async getEventNotifications(
    ctx: Ctx,
    eventId: string,
  ): Promise<Notification[]> {
    return await this.repository.findNotificationsByEventId(ctx, eventId);
  }

  // ==========================================================================
  // INTERNAL - WORKER METHODS
  // ==========================================================================

  /**
   * Get pending events to process
   */
  async getPendingEvents(ctx: Ctx): Promise<NotificationEvent[]> {
    return await this.repository.findPendingEvents(ctx);
  }

  /**
   * Atomically claim a pending event for processing.
   * Returns the event if successfully claimed, undefined if already taken.
   */
  async claimEvent(
    ctx: Ctx,
    eventId: string,
  ): Promise<NotificationEvent | undefined> {
    return await this.repository.claimPendingEvent(ctx, eventId);
  }

  /**
   * Claim pending email notifications for sending (batch).
   */
  async claimPendingEmails(
    ctx: Ctx,
    limit: number = 10,
  ): Promise<Notification[]> {
    return await this.repository.claimPendingEmailNotifications(ctx, limit);
  }

  /**
   * Claim a retryable failed email notification.
   */
  async claimRetryableEmail(
    ctx: Ctx,
    notificationId: string,
  ): Promise<Notification | undefined> {
    return await this.repository.claimRetryableEmailNotification(
      ctx,
      notificationId,
    );
  }

  /**
   * Mark an event as completed
   */
  async markEventCompleted(
    ctx: Ctx,
    eventId: string,
  ): Promise<NotificationEvent | undefined> {
    return await this.repository.updateEvent(ctx, eventId, {
      status: NotificationEventStatus.COMPLETED,
      processedAt: new Date(),
    });
  }

  /**
   * Mark an event as failed
   */
  async markEventFailed(
    ctx: Ctx,
    eventId: string,
    error: string,
  ): Promise<NotificationEvent | undefined> {
    return await this.repository.updateEvent(ctx, eventId, {
      status: NotificationEventStatus.FAILED,
      processedAt: new Date(),
      error,
    });
  }

  /**
   * Create a notification record
   */
  async createNotification(
    ctx: Ctx,
    data: {
      eventId: string;
      eventType: NotificationEventType;
      recipientId: string;
      recipientRole: NotificationRecipientRole;
      channel: NotificationChannel;
      title: string;
      body: string;
      actionUrl?: string;
    },
  ): Promise<Notification> {
    const notification: Notification = {
      id: generateNotificationId(),
      eventId: data.eventId,
      eventType: data.eventType,
      recipientId: data.recipientId,
      recipientRole: data.recipientRole,
      channel: data.channel,
      title: data.title,
      body: data.body,
      actionUrl: data.actionUrl,
      status:
        data.channel === NotificationChannel.IN_APP
          ? NotificationStatus.DELIVERED
          : NotificationStatus.PENDING,
      read: false,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.repository.createNotification(ctx, notification);
  }

  /**
   * Get template for rendering
   */
  async getTemplate(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
    recipientRole: NotificationRecipientRole,
  ): Promise<NotificationTemplate | undefined> {
    // Try exact locale first
    let template = await this.repository.findTemplate(
      ctx,
      eventType,
      channel,
      locale,
      recipientRole,
    );

    // Fall back to Spanish if not found
    if (!template && locale !== 'es') {
      template = await this.repository.findTemplate(
        ctx,
        eventType,
        channel,
        'es',
        recipientRole,
      );
    }

    return template;
  }

  /**
   * Get channel config for an event type
   */
  async getChannelConfigForEvent(
    ctx: Ctx,
    eventType: NotificationEventType,
  ): Promise<NotificationChannelConfig | undefined> {
    return await this.repository.findChannelConfig(ctx, eventType);
  }

  /**
   * Get pending email notifications
   */
  async getPendingEmailNotifications(ctx: Ctx): Promise<Notification[]> {
    return await this.repository.findPendingEmailNotifications(ctx);
  }

  /**
   * Get retryable failed email notifications
   */
  async getRetryableEmailNotifications(ctx: Ctx): Promise<Notification[]> {
    return await this.repository.findRetryableEmailNotifications(ctx);
  }

  /**
   * Mark notification as sent
   */
  async markNotificationSent(
    ctx: Ctx,
    notificationId: string,
  ): Promise<Notification | undefined> {
    return await this.repository.updateNotification(ctx, notificationId, {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    });
  }

  /**
   * Mark notification as delivered
   */
  async markNotificationDelivered(
    ctx: Ctx,
    notificationId: string,
  ): Promise<Notification | undefined> {
    return await this.repository.updateNotification(ctx, notificationId, {
      status: NotificationStatus.DELIVERED,
      deliveredAt: new Date(),
    });
  }

  /**
   * Mark notification as failed with retry scheduling
   */
  async markNotificationFailed(
    ctx: Ctx,
    notificationId: string,
    reason: string,
  ): Promise<Notification | undefined> {
    const notification = await this.repository.findNotificationById(
      ctx,
      notificationId,
    );
    if (!notification) return undefined;

    const newRetryCount = notification.retryCount + 1;
    let nextRetryAt: Date | undefined;

    const retryConfig = this.configService.get<{
      maxRetries: number;
      backoffMinutes: number[];
    }>('notifications.retry') ?? { maxRetries: 3, backoffMinutes: [1, 5, 15] };
    if (newRetryCount < retryConfig.maxRetries) {
      const backoffMinutes =
        retryConfig.backoffMinutes[newRetryCount - 1] ?? 15;
      nextRetryAt = new Date();
      nextRetryAt.setMinutes(nextRetryAt.getMinutes() + backoffMinutes);
    }

    return await this.repository.updateNotification(ctx, notificationId, {
      status: NotificationStatus.FAILED,
      failedAt: new Date(),
      failureReason: reason,
      retryCount: newRetryCount,
      nextRetryAt,
    });
  }

  /**
   * Cleanup old notifications (retention policy)
   */
  async cleanupOldNotifications(ctx: Ctx): Promise<number> {
    const deletedCount = await this.repository.deleteOldNotifications(ctx);
    if (deletedCount > 0) {
      this.logger.log(ctx, `Cleaned up ${deletedCount} old notifications`);
    }
    return deletedCount;
  }
}
