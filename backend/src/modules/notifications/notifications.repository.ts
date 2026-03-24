import { Injectable } from '@nestjs/common';
import {
  NotificationEvent as PrismaNotificationEvent,
  Notification as PrismaNotification,
  NotificationTemplate as PrismaNotificationTemplate,
  NotificationChannelConfig as PrismaNotificationChannelConfig,
  NotificationEventType as PrismaNotificationEventType,
  NotificationEventStatus as PrismaNotificationEventStatus,
  NotificationChannel as PrismaNotificationChannel,
  NotificationStatus as PrismaNotificationStatus,
  NotificationPriority as PrismaNotificationPriority,
  NotificationRecipientRole as PrismaNotificationRecipientRole,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type {
  NotificationEvent,
  Notification,
  NotificationTemplate,
  NotificationChannelConfig,
} from './notifications.domain';
import {
  NotificationEventStatus,
  NotificationStatus,
  NotificationChannel,
  NotificationEventType,
  NotificationPriority,
  NotificationRecipientRole,
  NOTIFICATION_RETENTION_DAYS,
} from './notifications.domain';
import type { INotificationsRepository } from './notifications.repository.interface';

@Injectable()
export class NotificationsRepository
  extends BaseRepository
  implements INotificationsRepository
{
  private readonly logger = new ContextLogger(NotificationsRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ==========================================================================
  // NOTIFICATION EVENTS
  // ==========================================================================

  async createEvent(
    ctx: Ctx,
    event: NotificationEvent,
  ): Promise<NotificationEvent> {
    this.logger.debug(ctx, 'createEvent', { eventId: event.id });
    const client = this.getClient(ctx);
    const created = await client.notificationEvent.create({
      data: {
        id: event.id,
        type: this.mapEventTypeToDb(event.type),
        context: event.context as object,
        triggeredBy: event.triggeredBy,
        triggeredAt: event.triggeredAt,
        status: this.mapEventStatusToDb(event.status),
        processedAt: event.processedAt,
        error: event.error,
      },
    });
    return this.mapToNotificationEvent(created);
  }

  async findEventById(
    ctx: Ctx,
    id: string,
  ): Promise<NotificationEvent | undefined> {
    this.logger.debug(ctx, 'findEventById', { id });
    const client = this.getClient(ctx);
    const event = await client.notificationEvent.findUnique({
      where: { id },
    });
    return event ? this.mapToNotificationEvent(event) : undefined;
  }

  async findPendingEvents(ctx: Ctx): Promise<NotificationEvent[]> {
    this.logger.debug(ctx, 'findPendingEvents');
    const client = this.getClient(ctx);
    const events = await client.notificationEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { triggeredAt: 'asc' },
      take: 200,
    });
    return events.map((e) => this.mapToNotificationEvent(e));
  }

  async countPendingEvents(ctx: Ctx): Promise<number> {
    this.logger.debug(ctx, 'countPendingEvents');
    const client = this.getClient(ctx);
    return client.notificationEvent.count({
      where: { status: 'PENDING' },
    });
  }

  async updateEvent(
    ctx: Ctx,
    id: string,
    updates: Partial<NotificationEvent>,
  ): Promise<NotificationEvent | undefined> {
    this.logger.debug(ctx, 'updateEvent', { id });
    const client = this.getClient(ctx);
    const existing = await client.notificationEvent.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const updated = await client.notificationEvent.update({
      where: { id },
      data: {
        ...(updates.status !== undefined && {
          status: this.mapEventStatusToDb(updates.status),
        }),
        ...(updates.processedAt !== undefined && {
          processedAt: updates.processedAt,
        }),
        ...(updates.error !== undefined && { error: updates.error }),
      },
    });
    return this.mapToNotificationEvent(updated);
  }

  async getEventsPaginated(
    ctx: Ctx,
    page: number,
    limit: number,
    filters?: {
      type?: NotificationEventType;
      status?: NotificationEventStatus;
      from?: Date;
      to?: Date;
    },
  ): Promise<{ events: NotificationEvent[]; total: number }> {
    this.logger.debug(ctx, 'getEventsPaginated', { page, limit });
    const client = this.getClient(ctx);
    const where: Parameters<
      typeof this.prisma.notificationEvent.findMany
    >[0]['where'] = {};

    if (filters?.type) {
      where.type = this.mapEventTypeToDb(filters.type);
    }
    if (filters?.status) {
      where.status = this.mapEventStatusToDb(filters.status);
    }
    if (filters?.from || filters?.to) {
      where.triggeredAt = {};
      if (filters.from) {
        where.triggeredAt.gte = filters.from;
      }
      if (filters.to) {
        where.triggeredAt.lte = filters.to;
      }
    }

    const [events, total] = await Promise.all([
      client.notificationEvent.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      client.notificationEvent.count({ where }),
    ]);

    return {
      events: events.map((e) => this.mapToNotificationEvent(e)),
      total,
    };
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  async createNotification(
    ctx: Ctx,
    notification: Notification,
  ): Promise<Notification> {
    this.logger.debug(ctx, 'createNotification', { notificationId: notification.id, eventId: notification.eventId });
    const client = this.getClient(ctx);
    const created = await client.notification.create({
      data: {
        id: notification.id,
        eventId: notification.eventId,
        eventType: this.mapEventTypeToDb(notification.eventType),
        recipientId: notification.recipientId,
        channel: this.mapChannelToDb(notification.channel),
        recipientRole: this.mapRecipientRoleToDb(notification.recipientRole),
        title: notification.title,
        body: notification.body,
        actionUrl: notification.actionUrl,
        status: this.mapStatusToDb(notification.status),
        read: notification.read,
        readAt: notification.readAt,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        failedAt: notification.failedAt,
        failureReason: notification.failureReason,
        retryCount: notification.retryCount,
        nextRetryAt: notification.nextRetryAt,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
      },
    });
    return this.mapToNotification(created);
  }

  async findNotificationById(
    ctx: Ctx,
    id: string,
  ): Promise<Notification | undefined> {
    this.logger.debug(ctx, 'findNotificationById', { id });
    const client = this.getClient(ctx);
    const notification = await client.notification.findUnique({
      where: { id },
    });
    return notification ? this.mapToNotification(notification) : undefined;
  }

  async findNotificationsByEventId(
    ctx: Ctx,
    eventId: string,
  ): Promise<Notification[]> {
    this.logger.debug(ctx, 'findNotificationsByEventId', { eventId });
    const client = this.getClient(ctx);
    const notifications = await client.notification.findMany({
      where: { eventId },
    });
    return notifications.map((n) => this.mapToNotification(n));
  }

  async findUserInAppNotifications(
    ctx: Ctx,
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ): Promise<{ notifications: Notification[]; total: number }> {
    this.logger.debug(ctx, 'findUserInAppNotifications', { userId, page, limit, unreadOnly });
    const client = this.getClient(ctx);
    const where: Parameters<
      typeof this.prisma.notification.findMany
    >[0]['where'] = {
      recipientId: userId,
      channel: 'IN_APP',
    };

    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      client.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      client.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => this.mapToNotification(n)),
      total,
    };
  }

  async countUnreadNotifications(ctx: Ctx, userId: string): Promise<number> {
    this.logger.debug(ctx, 'countUnreadNotifications', { userId });
    const client = this.getClient(ctx);
    return await client.notification.count({
      where: {
        recipientId: userId,
        channel: 'IN_APP',
        read: false,
      },
    });
  }

  async updateNotification(
    ctx: Ctx,
    id: string,
    updates: Partial<Notification>,
  ): Promise<Notification | undefined> {
    this.logger.debug(ctx, 'updateNotification', { id });
    const client = this.getClient(ctx);
    const existing = await client.notification.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const updated = await client.notification.update({
      where: { id },
      data: {
        ...(updates.status !== undefined && {
          status: this.mapStatusToDb(updates.status),
        }),
        ...(updates.read !== undefined && { read: updates.read }),
        ...(updates.readAt !== undefined && { readAt: updates.readAt }),
        ...(updates.sentAt !== undefined && { sentAt: updates.sentAt }),
        ...(updates.deliveredAt !== undefined && {
          deliveredAt: updates.deliveredAt,
        }),
        ...(updates.failedAt !== undefined && { failedAt: updates.failedAt }),
        ...(updates.failureReason !== undefined && {
          failureReason: updates.failureReason,
        }),
        ...(updates.retryCount !== undefined && {
          retryCount: updates.retryCount,
        }),
        ...(updates.nextRetryAt !== undefined && {
          nextRetryAt: updates.nextRetryAt,
        }),
        updatedAt: new Date(),
      },
    });
    return this.mapToNotification(updated);
  }

  async markAllAsRead(ctx: Ctx, userId: string): Promise<number> {
    this.logger.debug(ctx, 'markAllAsRead', { userId });
    const client = this.getClient(ctx);
    const now = new Date();
    const result = await client.notification.updateMany({
      where: {
        recipientId: userId,
        channel: 'IN_APP',
        read: false,
      },
      data: {
        read: true,
        readAt: now,
        updatedAt: now,
      },
    });
    return result.count;
  }

  async markAsReadBatch(
    ctx: Ctx,
    userId: string,
    notificationIds: string[],
  ): Promise<number> {
    this.logger.debug(ctx, 'markAsReadBatch', { userId, count: notificationIds.length });
    if (notificationIds.length === 0) return 0;
    const client = this.getClient(ctx);
    const now = new Date();
    const result = await client.notification.updateMany({
      where: {
        id: { in: notificationIds },
        recipientId: userId,
        channel: 'IN_APP',
        read: false,
      },
      data: {
        read: true,
        readAt: now,
        updatedAt: now,
      },
    });
    return result.count;
  }

  async findPendingEmailNotifications(ctx: Ctx): Promise<Notification[]> {
    this.logger.debug(ctx, 'findPendingEmailNotifications');
    const client = this.getClient(ctx);
    const notifications = await client.notification.findMany({
      where: {
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });
    return notifications.map((n) => this.mapToNotification(n));
  }

  async findRetryableEmailNotifications(ctx: Ctx): Promise<Notification[]> {
    this.logger.debug(ctx, 'findRetryableEmailNotifications');
    const client = this.getClient(ctx);
    const now = new Date();
    const notifications = await client.notification.findMany({
      where: {
        channel: 'EMAIL',
        status: 'FAILED',
        retryCount: { lt: 3 },
        nextRetryAt: { lte: now },
      },
    });
    return notifications.map((n) => this.mapToNotification(n));
  }

  async deleteOldNotifications(ctx: Ctx): Promise<number> {
    this.logger.debug(ctx, 'deleteOldNotifications');
    const client = this.getClient(ctx);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_RETENTION_DAYS);

    const result = await client.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    return result.count;
  }

  // ==========================================================================
  // ATOMIC CLAIM METHODS
  // ==========================================================================

  async claimPendingEvent(
    ctx: Ctx,
    eventId: string,
  ): Promise<NotificationEvent | undefined> {
    this.logger.debug(ctx, 'claimPendingEvent', { eventId });
    const client = this.getClient(ctx);

    const result = await client.notificationEvent.updateMany({
      where: {
        id: eventId,
        status: 'PENDING',
      },
      data: {
        status: 'PROCESSING',
      },
    });

    if (result.count === 0) {
      return undefined;
    }

    const event = await client.notificationEvent.findUnique({
      where: { id: eventId },
    });
    return event ? this.mapToNotificationEvent(event) : undefined;
  }

  async claimPendingEmailNotifications(
    ctx: Ctx,
    limit: number,
  ): Promise<Notification[]> {
    this.logger.debug(ctx, 'claimPendingEmailNotifications', { limit });
    const client = this.getClient(ctx);

    const pending = await client.notification.findMany({
      where: {
        channel: 'EMAIL',
        status: 'PENDING',
      },
      take: limit,
      select: { id: true },
    });

    if (pending.length === 0) {
      return [];
    }

    const ids = pending.map((n) => n.id);
    const now = new Date();

    await client.notification.updateMany({
      where: {
        id: { in: ids },
        status: 'PENDING',
      },
      data: {
        status: 'QUEUED',
        updatedAt: now,
      },
    });

    const claimed = await client.notification.findMany({
      where: {
        id: { in: ids },
        status: 'QUEUED',
      },
    });

    return claimed.map((n) => this.mapToNotification(n));
  }

  async claimRetryableEmailNotification(
    ctx: Ctx,
    notificationId: string,
  ): Promise<Notification | undefined> {
    this.logger.debug(ctx, 'claimRetryableEmailNotification', { notificationId });
    const client = this.getClient(ctx);
    const now = new Date();
    const nextRetryAt = new Date(now.getTime() + 5 * 60 * 1000);

    const result = await client.notification.updateMany({
      where: {
        id: notificationId,
        channel: 'EMAIL',
        status: 'FAILED',
        retryCount: { lt: 3 },
        nextRetryAt: { lte: now },
      },
      data: {
        status: 'QUEUED',
        nextRetryAt: nextRetryAt,
        updatedAt: now,
      },
    });

    if (result.count === 0) {
      return undefined;
    }

    const notification = await client.notification.findUnique({
      where: { id: notificationId },
    });
    return notification ? this.mapToNotification(notification) : undefined;
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  async createTemplate(
    ctx: Ctx,
    template: NotificationTemplate,
  ): Promise<NotificationTemplate> {
    this.logger.debug(ctx, 'createTemplate', { templateId: template.id });
    const client = this.getClient(ctx);
    const created = await client.notificationTemplate.create({
      data: {
        id: template.id,
        eventType: this.mapEventTypeToDb(template.eventType),
        channel: this.mapChannelToDb(template.channel),
        locale: template.locale,
        recipientRole: this.mapRecipientRoleToDb(template.recipientRole),
        titleTemplate: template.titleTemplate,
        bodyTemplate: template.bodyTemplate,
        actionUrlTemplate: template.actionUrlTemplate,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        updatedBy: template.updatedBy,
      },
    });
    return this.mapToNotificationTemplate(created);
  }

  async findTemplateById(
    ctx: Ctx,
    id: string,
  ): Promise<NotificationTemplate | undefined> {
    this.logger.debug(ctx, 'findTemplateById', { id });
    const client = this.getClient(ctx);
    const template = await client.notificationTemplate.findUnique({
      where: { id },
    });
    return template ? this.mapToNotificationTemplate(template) : undefined;
  }

  async findTemplate(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
    recipientRole: NotificationRecipientRole,
  ): Promise<NotificationTemplate | undefined> {
    this.logger.debug(ctx, 'findTemplate', { eventType, channel, locale, recipientRole });
    const client = this.getClient(ctx);
    const template = await client.notificationTemplate.findFirst({
      where: {
        eventType: this.mapEventTypeToDb(eventType),
        channel: this.mapChannelToDb(channel),
        locale,
        recipientRole: this.mapRecipientRoleToDb(recipientRole),
        isActive: true,
      },
    });
    return template ? this.mapToNotificationTemplate(template) : undefined;
  }

  async findAllTemplates(ctx: Ctx): Promise<NotificationTemplate[]> {
    this.logger.debug(ctx, 'findAllTemplates');
    const client = this.getClient(ctx);
    const templates = await client.notificationTemplate.findMany();
    return templates.map((t) => this.mapToNotificationTemplate(t));
  }

  async updateTemplate(
    ctx: Ctx,
    id: string,
    updates: Partial<NotificationTemplate>,
  ): Promise<NotificationTemplate | undefined> {
    this.logger.debug(ctx, 'updateTemplate', { id });
    const client = this.getClient(ctx);
    const existing = await client.notificationTemplate.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const updated = await client.notificationTemplate.update({
      where: { id },
      data: {
        ...(updates.titleTemplate !== undefined && {
          titleTemplate: updates.titleTemplate,
        }),
        ...(updates.bodyTemplate !== undefined && {
          bodyTemplate: updates.bodyTemplate,
        }),
        ...(updates.actionUrlTemplate !== undefined && {
          actionUrlTemplate: updates.actionUrlTemplate,
        }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
        ...(updates.updatedBy !== undefined && {
          updatedBy: updates.updatedBy,
        }),
        updatedAt: new Date(),
      },
    });
    return this.mapToNotificationTemplate(updated);
  }

  // ==========================================================================
  // CHANNEL CONFIG
  // ==========================================================================

  async createChannelConfig(
    ctx: Ctx,
    config: NotificationChannelConfig,
  ): Promise<NotificationChannelConfig> {
    this.logger.debug(ctx, 'createChannelConfig', { configId: config.id });
    const client = this.getClient(ctx);
    const created = await client.notificationChannelConfig.create({
      data: {
        id: config.id,
        eventType: this.mapEventTypeToDb(config.eventType),
        inAppEnabled: config.inAppEnabled,
        emailEnabled: config.emailEnabled,
        priority: this.mapPriorityToDb(config.priority),
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
      },
    });
    return this.mapToNotificationChannelConfig(created);
  }

  async findChannelConfig(
    ctx: Ctx,
    eventType: NotificationEventType,
  ): Promise<NotificationChannelConfig | undefined> {
    this.logger.debug(ctx, 'findChannelConfig', { eventType });
    const client = this.getClient(ctx);
    const config = await client.notificationChannelConfig.findUnique({
      where: { eventType: this.mapEventTypeToDb(eventType) },
    });
    return config ? this.mapToNotificationChannelConfig(config) : undefined;
  }

  async findAllChannelConfigs(ctx: Ctx): Promise<NotificationChannelConfig[]> {
    this.logger.debug(ctx, 'findAllChannelConfigs');
    const client = this.getClient(ctx);
    const configs = await client.notificationChannelConfig.findMany();
    return configs.map((c) => this.mapToNotificationChannelConfig(c));
  }

  async updateChannelConfig(
    ctx: Ctx,
    eventType: NotificationEventType,
    updates: Partial<NotificationChannelConfig>,
  ): Promise<NotificationChannelConfig | undefined> {
    this.logger.debug(ctx, 'updateChannelConfig', { eventType });
    const client = this.getClient(ctx);
    const existing = await client.notificationChannelConfig.findUnique({
      where: { eventType: this.mapEventTypeToDb(eventType) },
    });
    if (!existing) return undefined;

    const updated = await client.notificationChannelConfig.update({
      where: { eventType: this.mapEventTypeToDb(eventType) },
      data: {
        ...(updates.inAppEnabled !== undefined && {
          inAppEnabled: updates.inAppEnabled,
        }),
        ...(updates.emailEnabled !== undefined && {
          emailEnabled: updates.emailEnabled,
        }),
        ...(updates.priority !== undefined && {
          priority: this.mapPriorityToDb(updates.priority),
        }),
        ...(updates.updatedBy !== undefined && {
          updatedBy: updates.updatedBy,
        }),
        updatedAt: new Date(),
      },
    });
    return this.mapToNotificationChannelConfig(updated);
  }

  // ==========================================================================
  // MAPPERS - Domain to Prisma
  // ==========================================================================

  private mapEventTypeToDb(
    type: NotificationEventType,
  ): PrismaNotificationEventType {
    return type as PrismaNotificationEventType;
  }

  private mapEventStatusToDb(
    status: NotificationEventStatus,
  ): PrismaNotificationEventStatus {
    return status as PrismaNotificationEventStatus;
  }

  private mapChannelToDb(
    channel: NotificationChannel,
  ): PrismaNotificationChannel {
    return channel as PrismaNotificationChannel;
  }

  private mapStatusToDb(status: NotificationStatus): PrismaNotificationStatus {
    return status as PrismaNotificationStatus;
  }

  private mapPriorityToDb(
    priority: NotificationPriority,
  ): PrismaNotificationPriority {
    return priority as PrismaNotificationPriority;
  }

  private mapRecipientRoleToDb(
    role: NotificationRecipientRole,
  ): PrismaNotificationRecipientRole {
    return role as PrismaNotificationRecipientRole;
  }

  // ==========================================================================
  // MAPPERS - Prisma to Domain
  // ==========================================================================

  private mapEventTypeFromDb(
    type: PrismaNotificationEventType,
  ): NotificationEventType {
    return type as NotificationEventType;
  }

  private mapEventStatusFromDb(
    status: PrismaNotificationEventStatus,
  ): NotificationEventStatus {
    return status as NotificationEventStatus;
  }

  private mapChannelFromDb(
    channel: PrismaNotificationChannel,
  ): NotificationChannel {
    return channel as NotificationChannel;
  }

  private mapStatusFromDb(
    status: PrismaNotificationStatus,
  ): NotificationStatus {
    return status as NotificationStatus;
  }

  private mapPriorityFromDb(
    priority: PrismaNotificationPriority,
  ): NotificationPriority {
    return priority as NotificationPriority;
  }

  private mapRecipientRoleFromDb(
    role: PrismaNotificationRecipientRole,
  ): NotificationRecipientRole {
    return role as NotificationRecipientRole;
  }

  private mapToNotificationEvent(
    prisma: PrismaNotificationEvent,
  ): NotificationEvent {
    return {
      id: prisma.id,
      type: this.mapEventTypeFromDb(prisma.type),
      context: prisma.context as Record<string, unknown>,
      triggeredBy: prisma.triggeredBy ?? undefined,
      triggeredAt: prisma.triggeredAt,
      status: this.mapEventStatusFromDb(prisma.status),
      processedAt: prisma.processedAt ?? undefined,
      error: prisma.error ?? undefined,
    };
  }

  private mapToNotification(prisma: PrismaNotification): Notification {
    return {
      id: prisma.id,
      eventId: prisma.eventId,
      eventType: this.mapEventTypeFromDb(prisma.eventType),
      recipientId: prisma.recipientId,
      channel: this.mapChannelFromDb(prisma.channel),
      recipientRole: this.mapRecipientRoleFromDb(prisma.recipientRole),
      title: prisma.title,
      body: prisma.body,
      actionUrl: prisma.actionUrl ?? undefined,
      status: this.mapStatusFromDb(prisma.status),
      read: prisma.read,
      readAt: prisma.readAt ?? undefined,
      sentAt: prisma.sentAt ?? undefined,
      deliveredAt: prisma.deliveredAt ?? undefined,
      failedAt: prisma.failedAt ?? undefined,
      failureReason: prisma.failureReason ?? undefined,
      retryCount: prisma.retryCount,
      nextRetryAt: prisma.nextRetryAt ?? undefined,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    };
  }

  private mapToNotificationTemplate(
    prisma: PrismaNotificationTemplate,
  ): NotificationTemplate {
    return {
      id: prisma.id,
      eventType: this.mapEventTypeFromDb(prisma.eventType),
      channel: this.mapChannelFromDb(prisma.channel),
      locale: prisma.locale,
      recipientRole: this.mapRecipientRoleFromDb(prisma.recipientRole),
      titleTemplate: prisma.titleTemplate,
      bodyTemplate: prisma.bodyTemplate,
      actionUrlTemplate: prisma.actionUrlTemplate ?? undefined,
      isActive: prisma.isActive,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      updatedBy: prisma.updatedBy ?? undefined,
    };
  }

  private mapToNotificationChannelConfig(
    prisma: PrismaNotificationChannelConfig,
  ): NotificationChannelConfig {
    return {
      id: prisma.id,
      eventType: this.mapEventTypeFromDb(prisma.eventType),
      inAppEnabled: prisma.inAppEnabled,
      emailEnabled: prisma.emailEnabled,
      priority: this.mapPriorityFromDb(prisma.priority),
      updatedAt: prisma.updatedAt,
      updatedBy: prisma.updatedBy ?? undefined,
    };
  }
}
