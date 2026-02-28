import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
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
  NOTIFICATION_RETENTION_DAYS,
} from './notifications.domain';

@Injectable()
export class NotificationsRepository implements OnModuleInit {
  private readonly eventsStorage: KeyValueFileStorage<NotificationEvent>;
  private readonly notificationsStorage: KeyValueFileStorage<Notification>;
  private readonly templatesStorage: KeyValueFileStorage<NotificationTemplate>;
  private readonly channelConfigStorage: KeyValueFileStorage<NotificationChannelConfig>;

  constructor() {
    this.eventsStorage = new KeyValueFileStorage<NotificationEvent>(
      'notification-events',
    );
    this.notificationsStorage = new KeyValueFileStorage<Notification>(
      'notifications',
    );
    this.templatesStorage = new KeyValueFileStorage<NotificationTemplate>(
      'notification-templates',
    );
    this.channelConfigStorage =
      new KeyValueFileStorage<NotificationChannelConfig>(
        'notification-channel-configs',
      );
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.eventsStorage.onModuleInit(),
      this.notificationsStorage.onModuleInit(),
      this.templatesStorage.onModuleInit(),
      this.channelConfigStorage.onModuleInit(),
    ]);
  }

  // ==========================================================================
  // NOTIFICATION EVENTS
  // ==========================================================================

  async createEvent(
    ctx: Ctx,
    event: NotificationEvent,
  ): Promise<NotificationEvent> {
    await this.eventsStorage.set(ctx, event.id, event);
    return event;
  }

  async findEventById(
    ctx: Ctx,
    id: string,
  ): Promise<NotificationEvent | undefined> {
    return await this.eventsStorage.get(ctx, id);
  }

  async findPendingEvents(ctx: Ctx): Promise<NotificationEvent[]> {
    const all = await this.eventsStorage.getAll(ctx);
    return all
      .filter((e) => e.status === NotificationEventStatus.PENDING)
      .sort(
        (a, b) =>
          new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime(),
      );
  }

  async updateEvent(
    ctx: Ctx,
    id: string,
    updates: Partial<NotificationEvent>,
  ): Promise<NotificationEvent | undefined> {
    const existing = await this.eventsStorage.get(ctx, id);
    if (!existing) return undefined;

    const updated: NotificationEvent = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    await this.eventsStorage.set(ctx, id, updated);
    return updated;
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
    let all = await this.eventsStorage.getAll(ctx);

    if (filters) {
      if (filters.type) {
        all = all.filter((e) => e.type === filters.type);
      }
      if (filters.status) {
        all = all.filter((e) => e.status === filters.status);
      }
      if (filters.from) {
        all = all.filter(
          (e) => new Date(e.triggeredAt) >= filters.from!,
        );
      }
      if (filters.to) {
        all = all.filter((e) => new Date(e.triggeredAt) <= filters.to!);
      }
    }

    const sorted = all.sort(
      (a, b) =>
        new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
    );
    const total = sorted.length;
    const start = (page - 1) * limit;
    const events = sorted.slice(start, start + limit);

    return { events, total };
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  async createNotification(
    ctx: Ctx,
    notification: Notification,
  ): Promise<Notification> {
    await this.notificationsStorage.set(ctx, notification.id, notification);
    return notification;
  }

  async findNotificationById(
    ctx: Ctx,
    id: string,
  ): Promise<Notification | undefined> {
    return await this.notificationsStorage.get(ctx, id);
  }

  async findNotificationsByEventId(
    ctx: Ctx,
    eventId: string,
  ): Promise<Notification[]> {
    const all = await this.notificationsStorage.getAll(ctx);
    return all.filter((n) => n.eventId === eventId);
  }

  async findUserInAppNotifications(
    ctx: Ctx,
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const all = await this.notificationsStorage.getAll(ctx);

    let filtered = all.filter(
      (n) =>
        n.recipientId === userId && n.channel === NotificationChannel.IN_APP,
    );

    if (unreadOnly) {
      filtered = filtered.filter((n) => !n.read);
    }

    const sorted = filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = sorted.length;
    const start = (page - 1) * limit;
    const notifications = sorted.slice(start, start + limit);

    return { notifications, total };
  }

  async countUnreadNotifications(ctx: Ctx, userId: string): Promise<number> {
    const all = await this.notificationsStorage.getAll(ctx);
    return all.filter(
      (n) =>
        n.recipientId === userId &&
        n.channel === NotificationChannel.IN_APP &&
        !n.read,
    ).length;
  }

  async updateNotification(
    ctx: Ctx,
    id: string,
    updates: Partial<Notification>,
  ): Promise<Notification | undefined> {
    const existing = await this.notificationsStorage.get(ctx, id);
    if (!existing) return undefined;

    const updated: Notification = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
    };
    await this.notificationsStorage.set(ctx, id, updated);
    return updated;
  }

  async markAllAsRead(ctx: Ctx, userId: string): Promise<number> {
    const all = await this.notificationsStorage.getAll(ctx);
    const unread = all.filter(
      (n) =>
        n.recipientId === userId &&
        n.channel === NotificationChannel.IN_APP &&
        !n.read,
    );

    const now = new Date();
    for (const notification of unread) {
      const updated: Notification = {
        ...notification,
        read: true,
        readAt: now,
        updatedAt: now,
      };
      await this.notificationsStorage.set(ctx, notification.id, updated);
    }

    return unread.length;
  }

  async findPendingEmailNotifications(ctx: Ctx): Promise<Notification[]> {
    const all = await this.notificationsStorage.getAll(ctx);
    const now = new Date();
    return all.filter(
      (n) =>
        n.channel === NotificationChannel.EMAIL &&
        n.status === NotificationStatus.PENDING,
    );
  }

  async findRetryableEmailNotifications(ctx: Ctx): Promise<Notification[]> {
    const all = await this.notificationsStorage.getAll(ctx);
    const now = new Date();
    return all.filter(
      (n) =>
        n.channel === NotificationChannel.EMAIL &&
        n.status === NotificationStatus.FAILED &&
        n.retryCount < 3 &&
        n.nextRetryAt &&
        new Date(n.nextRetryAt) <= now,
    );
  }

  async deleteOldNotifications(ctx: Ctx): Promise<number> {
    const all = await this.notificationsStorage.getAll(ctx);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_RETENTION_DAYS);

    const toDelete = all.filter(
      (n) => new Date(n.createdAt) < cutoffDate,
    );

    for (const notification of toDelete) {
      await this.notificationsStorage.delete(ctx, notification.id);
    }

    return toDelete.length;
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  async createTemplate(
    ctx: Ctx,
    template: NotificationTemplate,
  ): Promise<NotificationTemplate> {
    await this.templatesStorage.set(ctx, template.id, template);
    return template;
  }

  async findTemplateById(
    ctx: Ctx,
    id: string,
  ): Promise<NotificationTemplate | undefined> {
    return await this.templatesStorage.get(ctx, id);
  }

  async findTemplate(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
  ): Promise<NotificationTemplate | undefined> {
    const all = await this.templatesStorage.getAll(ctx);
    return all.find(
      (t) =>
        t.eventType === eventType &&
        t.channel === channel &&
        t.locale === locale &&
        t.isActive,
    );
  }

  async findAllTemplates(ctx: Ctx): Promise<NotificationTemplate[]> {
    return await this.templatesStorage.getAll(ctx);
  }

  async updateTemplate(
    ctx: Ctx,
    id: string,
    updates: Partial<NotificationTemplate>,
  ): Promise<NotificationTemplate | undefined> {
    const existing = await this.templatesStorage.get(ctx, id);
    if (!existing) return undefined;

    const updated: NotificationTemplate = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
    };
    await this.templatesStorage.set(ctx, id, updated);
    return updated;
  }

  // ==========================================================================
  // CHANNEL CONFIG
  // ==========================================================================

  async createChannelConfig(
    ctx: Ctx,
    config: NotificationChannelConfig,
  ): Promise<NotificationChannelConfig> {
    await this.channelConfigStorage.set(ctx, config.id, config);
    return config;
  }

  async findChannelConfig(
    ctx: Ctx,
    eventType: NotificationEventType,
  ): Promise<NotificationChannelConfig | undefined> {
    const all = await this.channelConfigStorage.getAll(ctx);
    return all.find((c) => c.eventType === eventType);
  }

  async findAllChannelConfigs(ctx: Ctx): Promise<NotificationChannelConfig[]> {
    return await this.channelConfigStorage.getAll(ctx);
  }

  async updateChannelConfig(
    ctx: Ctx,
    eventType: NotificationEventType,
    updates: Partial<NotificationChannelConfig>,
  ): Promise<NotificationChannelConfig | undefined> {
    const all = await this.channelConfigStorage.getAll(ctx);
    const existing = all.find((c) => c.eventType === eventType);
    if (!existing) return undefined;

    const updated: NotificationChannelConfig = {
      ...existing,
      ...updates,
      eventType: existing.eventType,
      updatedAt: new Date(),
    };
    await this.channelConfigStorage.set(ctx, existing.id, updated);
    return updated;
  }
}
