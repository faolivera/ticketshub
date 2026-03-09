import type { Ctx } from '../../common/types/context';
import type {
  NotificationEvent,
  Notification,
  NotificationTemplate,
  NotificationChannelConfig,
} from './notifications.domain';
import {
  NotificationEventType,
  NotificationEventStatus,
  NotificationChannel,
} from './notifications.domain';

/**
 * Notifications repository interface
 */
export interface INotificationsRepository {
  // ==========================================================================
  // NOTIFICATION EVENTS
  // ==========================================================================

  /**
   * Create a notification event
   */
  createEvent(ctx: Ctx, event: NotificationEvent): Promise<NotificationEvent>;

  /**
   * Find event by ID
   */
  findEventById(ctx: Ctx, id: string): Promise<NotificationEvent | undefined>;

  /**
   * Find pending events for processing
   */
  findPendingEvents(ctx: Ctx): Promise<NotificationEvent[]>;

  /**
   * Update event
   */
  updateEvent(
    ctx: Ctx,
    id: string,
    updates: Partial<NotificationEvent>,
  ): Promise<NotificationEvent | undefined>;

  /**
   * Get paginated events with filters
   */
  getEventsPaginated(
    ctx: Ctx,
    page: number,
    limit: number,
    filters?: {
      type?: NotificationEventType;
      status?: NotificationEventStatus;
      from?: Date;
      to?: Date;
    },
  ): Promise<{ events: NotificationEvent[]; total: number }>;

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  /**
   * Create a notification
   */
  createNotification(
    ctx: Ctx,
    notification: Notification,
  ): Promise<Notification>;

  /**
   * Find notification by ID
   */
  findNotificationById(ctx: Ctx, id: string): Promise<Notification | undefined>;

  /**
   * Find notifications by event ID
   */
  findNotificationsByEventId(
    ctx: Ctx,
    eventId: string,
  ): Promise<Notification[]>;

  /**
   * Find user in-app notifications with pagination
   */
  findUserInAppNotifications(
    ctx: Ctx,
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ): Promise<{ notifications: Notification[]; total: number }>;

  /**
   * Count unread notifications for user
   */
  countUnreadNotifications(ctx: Ctx, userId: string): Promise<number>;

  /**
   * Update notification
   */
  updateNotification(
    ctx: Ctx,
    id: string,
    updates: Partial<Notification>,
  ): Promise<Notification | undefined>;

  /**
   * Mark all notifications as read for user
   */
  markAllAsRead(ctx: Ctx, userId: string): Promise<number>;

  /**
   * Mark specific in-app notifications as read for user (by ids)
   */
  markAsReadBatch(
    ctx: Ctx,
    userId: string,
    notificationIds: string[],
  ): Promise<number>;

  /**
   * Find pending email notifications
   */
  findPendingEmailNotifications(ctx: Ctx): Promise<Notification[]>;

  /**
   * Find retryable email notifications
   */
  findRetryableEmailNotifications(ctx: Ctx): Promise<Notification[]>;

  /**
   * Delete old notifications (retention policy)
   */
  deleteOldNotifications(ctx: Ctx): Promise<number>;

  // ==========================================================================
  // ATOMIC CLAIM METHODS
  // ==========================================================================

  /**
   * Atomically claim a pending event for processing.
   * Uses WHERE conditions to prevent duplicate claiming:
   * - status = PENDING
   * Returns the event if claimed, undefined if already claimed by another worker.
   */
  claimPendingEvent(
    ctx: Ctx,
    eventId: string,
  ): Promise<NotificationEvent | undefined>;

  /**
   * Atomically claim pending email notifications (batch).
   * Sets status to QUEUED and returns only the ones claimed.
   */
  claimPendingEmailNotifications(
    ctx: Ctx,
    limit: number,
  ): Promise<Notification[]>;

  /**
   * Atomically claim a retryable email notification.
   * Updates nextRetryAt to prevent re-claim and returns the notification if claimed.
   */
  claimRetryableEmailNotification(
    ctx: Ctx,
    notificationId: string,
  ): Promise<Notification | undefined>;

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  /**
   * Create a template
   */
  createTemplate(
    ctx: Ctx,
    template: NotificationTemplate,
  ): Promise<NotificationTemplate>;

  /**
   * Find template by ID
   */
  findTemplateById(
    ctx: Ctx,
    id: string,
  ): Promise<NotificationTemplate | undefined>;

  /**
   * Find template by event type, channel, and locale
   */
  findTemplate(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
  ): Promise<NotificationTemplate | undefined>;

  /**
   * Find all templates
   */
  findAllTemplates(ctx: Ctx): Promise<NotificationTemplate[]>;

  /**
   * Update template
   */
  updateTemplate(
    ctx: Ctx,
    id: string,
    updates: Partial<NotificationTemplate>,
  ): Promise<NotificationTemplate | undefined>;

  // ==========================================================================
  // CHANNEL CONFIG
  // ==========================================================================

  /**
   * Create channel config
   */
  createChannelConfig(
    ctx: Ctx,
    config: NotificationChannelConfig,
  ): Promise<NotificationChannelConfig>;

  /**
   * Find channel config by event type
   */
  findChannelConfig(
    ctx: Ctx,
    eventType: NotificationEventType,
  ): Promise<NotificationChannelConfig | undefined>;

  /**
   * Find all channel configs
   */
  findAllChannelConfigs(ctx: Ctx): Promise<NotificationChannelConfig[]>;

  /**
   * Update channel config
   */
  updateChannelConfig(
    ctx: Ctx,
    eventType: NotificationEventType,
    updates: Partial<NotificationChannelConfig>,
  ): Promise<NotificationChannelConfig | undefined>;
}

/**
 * Injection token for INotificationsRepository
 */
export const NOTIFICATIONS_REPOSITORY = Symbol('INotificationsRepository');
