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
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Ctx } from '../../common/types/context';
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
  NOTIFICATION_RETENTION_DAYS,
} from './notifications.domain';
import type { INotificationsRepository } from './notifications.repository.interface';

@Injectable()
export class NotificationsRepository implements INotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // NOTIFICATION EVENTS
  // ==========================================================================

  async createEvent(
    _ctx: Ctx,
    event: NotificationEvent,
  ): Promise<NotificationEvent> {
    const created = await this.prisma.notificationEvent.create({
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
    _ctx: Ctx,
    id: string,
  ): Promise<NotificationEvent | undefined> {
    const event = await this.prisma.notificationEvent.findUnique({
      where: { id },
    });
    return event ? this.mapToNotificationEvent(event) : undefined;
  }

  async findPendingEvents(_ctx: Ctx): Promise<NotificationEvent[]> {
    const events = await this.prisma.notificationEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { triggeredAt: 'asc' },
    });
    return events.map((e) => this.mapToNotificationEvent(e));
  }

  async updateEvent(
    _ctx: Ctx,
    id: string,
    updates: Partial<NotificationEvent>,
  ): Promise<NotificationEvent | undefined> {
    const existing = await this.prisma.notificationEvent.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const updated = await this.prisma.notificationEvent.update({
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
    _ctx: Ctx,
    page: number,
    limit: number,
    filters?: {
      type?: NotificationEventType;
      status?: NotificationEventStatus;
      from?: Date;
      to?: Date;
    },
  ): Promise<{ events: NotificationEvent[]; total: number }> {
    const where: Parameters<typeof this.prisma.notificationEvent.findMany>[0]['where'] = {};

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
      this.prisma.notificationEvent.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationEvent.count({ where }),
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
    _ctx: Ctx,
    notification: Notification,
  ): Promise<Notification> {
    const created = await this.prisma.notification.create({
      data: {
        id: notification.id,
        eventId: notification.eventId,
        eventType: this.mapEventTypeToDb(notification.eventType),
        recipientId: notification.recipientId,
        channel: this.mapChannelToDb(notification.channel),
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
    _ctx: Ctx,
    id: string,
  ): Promise<Notification | undefined> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    return notification ? this.mapToNotification(notification) : undefined;
  }

  async findNotificationsByEventId(
    _ctx: Ctx,
    eventId: string,
  ): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { eventId },
    });
    return notifications.map((n) => this.mapToNotification(n));
  }

  async findUserInAppNotifications(
    _ctx: Ctx,
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const where: Parameters<typeof this.prisma.notification.findMany>[0]['where'] = {
      recipientId: userId,
      channel: 'IN_APP',
    };

    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => this.mapToNotification(n)),
      total,
    };
  }

  async countUnreadNotifications(_ctx: Ctx, userId: string): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        recipientId: userId,
        channel: 'IN_APP',
        read: false,
      },
    });
  }

  async updateNotification(
    _ctx: Ctx,
    id: string,
    updates: Partial<Notification>,
  ): Promise<Notification | undefined> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const updated = await this.prisma.notification.update({
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

  async markAllAsRead(_ctx: Ctx, userId: string): Promise<number> {
    const now = new Date();
    const result = await this.prisma.notification.updateMany({
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

  async findPendingEmailNotifications(_ctx: Ctx): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        channel: 'EMAIL',
        status: 'PENDING',
      },
    });
    return notifications.map((n) => this.mapToNotification(n));
  }

  async findRetryableEmailNotifications(_ctx: Ctx): Promise<Notification[]> {
    const now = new Date();
    const notifications = await this.prisma.notification.findMany({
      where: {
        channel: 'EMAIL',
        status: 'FAILED',
        retryCount: { lt: 3 },
        nextRetryAt: { lte: now },
      },
    });
    return notifications.map((n) => this.mapToNotification(n));
  }

  async deleteOldNotifications(_ctx: Ctx): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_RETENTION_DAYS);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    return result.count;
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  async createTemplate(
    _ctx: Ctx,
    template: NotificationTemplate,
  ): Promise<NotificationTemplate> {
    const created = await this.prisma.notificationTemplate.create({
      data: {
        id: template.id,
        eventType: this.mapEventTypeToDb(template.eventType),
        channel: this.mapChannelToDb(template.channel),
        locale: template.locale,
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
    _ctx: Ctx,
    id: string,
  ): Promise<NotificationTemplate | undefined> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    return template ? this.mapToNotificationTemplate(template) : undefined;
  }

  async findTemplate(
    _ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
  ): Promise<NotificationTemplate | undefined> {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        eventType: this.mapEventTypeToDb(eventType),
        channel: this.mapChannelToDb(channel),
        locale,
        isActive: true,
      },
    });
    return template ? this.mapToNotificationTemplate(template) : undefined;
  }

  async findAllTemplates(_ctx: Ctx): Promise<NotificationTemplate[]> {
    const templates = await this.prisma.notificationTemplate.findMany();
    return templates.map((t) => this.mapToNotificationTemplate(t));
  }

  async updateTemplate(
    _ctx: Ctx,
    id: string,
    updates: Partial<NotificationTemplate>,
  ): Promise<NotificationTemplate | undefined> {
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const updated = await this.prisma.notificationTemplate.update({
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
        ...(updates.updatedBy !== undefined && { updatedBy: updates.updatedBy }),
        updatedAt: new Date(),
      },
    });
    return this.mapToNotificationTemplate(updated);
  }

  // ==========================================================================
  // CHANNEL CONFIG
  // ==========================================================================

  async createChannelConfig(
    _ctx: Ctx,
    config: NotificationChannelConfig,
  ): Promise<NotificationChannelConfig> {
    const created = await this.prisma.notificationChannelConfig.create({
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
    _ctx: Ctx,
    eventType: NotificationEventType,
  ): Promise<NotificationChannelConfig | undefined> {
    const config = await this.prisma.notificationChannelConfig.findUnique({
      where: { eventType: this.mapEventTypeToDb(eventType) },
    });
    return config ? this.mapToNotificationChannelConfig(config) : undefined;
  }

  async findAllChannelConfigs(
    _ctx: Ctx,
  ): Promise<NotificationChannelConfig[]> {
    const configs = await this.prisma.notificationChannelConfig.findMany();
    return configs.map((c) => this.mapToNotificationChannelConfig(c));
  }

  async updateChannelConfig(
    _ctx: Ctx,
    eventType: NotificationEventType,
    updates: Partial<NotificationChannelConfig>,
  ): Promise<NotificationChannelConfig | undefined> {
    const existing = await this.prisma.notificationChannelConfig.findUnique({
      where: { eventType: this.mapEventTypeToDb(eventType) },
    });
    if (!existing) return undefined;

    const updated = await this.prisma.notificationChannelConfig.update({
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
        ...(updates.updatedBy !== undefined && { updatedBy: updates.updatedBy }),
        updatedAt: new Date(),
      },
    });
    return this.mapToNotificationChannelConfig(updated);
  }

  // ==========================================================================
  // MAPPERS - Domain to Prisma
  // ==========================================================================

  private mapEventTypeToDb(type: NotificationEventType): PrismaNotificationEventType {
    return type as PrismaNotificationEventType;
  }

  private mapEventStatusToDb(status: NotificationEventStatus): PrismaNotificationEventStatus {
    return status as PrismaNotificationEventStatus;
  }

  private mapChannelToDb(channel: NotificationChannel): PrismaNotificationChannel {
    return channel as PrismaNotificationChannel;
  }

  private mapStatusToDb(status: NotificationStatus): PrismaNotificationStatus {
    return status as PrismaNotificationStatus;
  }

  private mapPriorityToDb(priority: NotificationPriority): PrismaNotificationPriority {
    return priority as PrismaNotificationPriority;
  }

  // ==========================================================================
  // MAPPERS - Prisma to Domain
  // ==========================================================================

  private mapEventTypeFromDb(type: PrismaNotificationEventType): NotificationEventType {
    return type as NotificationEventType;
  }

  private mapEventStatusFromDb(status: PrismaNotificationEventStatus): NotificationEventStatus {
    return status as NotificationEventStatus;
  }

  private mapChannelFromDb(channel: PrismaNotificationChannel): NotificationChannel {
    return channel as NotificationChannel;
  }

  private mapStatusFromDb(status: PrismaNotificationStatus): NotificationStatus {
    return status as NotificationStatus;
  }

  private mapPriorityFromDb(priority: PrismaNotificationPriority): NotificationPriority {
    return priority as NotificationPriority;
  }

  private mapToNotificationEvent(prisma: PrismaNotificationEvent): NotificationEvent {
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

  private mapToNotificationTemplate(prisma: PrismaNotificationTemplate): NotificationTemplate {
    return {
      id: prisma.id,
      eventType: this.mapEventTypeFromDb(prisma.eventType),
      channel: this.mapChannelFromDb(prisma.channel),
      locale: prisma.locale,
      titleTemplate: prisma.titleTemplate,
      bodyTemplate: prisma.bodyTemplate,
      actionUrlTemplate: prisma.actionUrlTemplate ?? undefined,
      isActive: prisma.isActive,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
      updatedBy: prisma.updatedBy ?? undefined,
    };
  }

  private mapToNotificationChannelConfig(prisma: PrismaNotificationChannelConfig): NotificationChannelConfig {
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
