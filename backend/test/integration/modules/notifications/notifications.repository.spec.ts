import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotificationsRepository } from '@/modules/notifications/notifications.repository';
import {
  NotificationEventType,
  NotificationEventStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  generateNotificationEventId,
  generateNotificationId,
  generateNotificationTemplateId,
  generateNotificationChannelConfigId,
} from '@/modules/notifications/notifications.domain';
import type {
  NotificationEvent,
  Notification,
  NotificationTemplate,
  NotificationChannelConfig,
} from '@/modules/notifications/notifications.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('NotificationsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: NotificationsRepository;
  let ctx: Ctx;
  let testUserId: string;

  const createTestUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}-${randomUUID()}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        publicName: 'testuser',
        password: 'hashedpassword',
        role: 'User',
        level: 'Basic',
        status: 'Enabled',
        country: 'Germany',
        currency: 'EUR',
        language: 'en',
        emailVerified: true,
        phoneVerified: false,
      },
    });
    return user.id;
  };

  const createValidEvent = (overrides?: Partial<NotificationEvent>): NotificationEvent => ({
    id: generateNotificationEventId(),
    type: NotificationEventType.PAYMENT_REQUIRED,
    context: { transactionId: randomUUID() },
    triggeredBy: testUserId,
    triggeredAt: new Date(),
    status: NotificationEventStatus.PENDING,
    ...overrides,
  });

  const createValidNotification = (
    eventId: string,
    overrides?: Partial<Notification>,
  ): Notification => ({
    id: generateNotificationId(),
    eventId,
    eventType: NotificationEventType.PAYMENT_REQUIRED,
    recipientId: testUserId,
    channel: NotificationChannel.IN_APP,
    title: 'Test Notification',
    body: 'This is a test notification body',
    status: NotificationStatus.PENDING,
    read: false,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createValidTemplate = (
    overrides?: Partial<NotificationTemplate>,
  ): NotificationTemplate => ({
    id: generateNotificationTemplateId(),
    eventType: NotificationEventType.PAYMENT_REQUIRED,
    channel: NotificationChannel.IN_APP,
    locale: 'en',
    titleTemplate: 'Payment Required for {{transactionId}}',
    bodyTemplate: 'Please complete your payment for transaction {{transactionId}}',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createValidChannelConfig = (
    overrides?: Partial<NotificationChannelConfig>,
  ): NotificationChannelConfig => ({
    id: generateNotificationChannelConfigId(),
    eventType: NotificationEventType.PAYMENT_REQUIRED,
    inAppEnabled: true,
    emailEnabled: true,
    priority: NotificationPriority.NORMAL,
    updatedAt: new Date(),
    ...overrides,
  });

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new NotificationsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==========================================================================
  // NOTIFICATION EVENTS
  // ==========================================================================

  describe('createEvent', () => {
    it('should create a notification event', async () => {
      const eventData = createValidEvent();

      const event = await repository.createEvent(ctx, eventData);

      expect(event).toBeDefined();
      expect(event.id).toBe(eventData.id);
      expect(event.type).toBe(NotificationEventType.PAYMENT_REQUIRED);
      expect(event.status).toBe(NotificationEventStatus.PENDING);
      expect(event.context).toEqual(eventData.context);
    });

    it('should create an event without triggeredBy', async () => {
      const eventData = createValidEvent({ triggeredBy: undefined });

      const event = await repository.createEvent(ctx, eventData);

      expect(event).toBeDefined();
      expect(event.triggeredBy).toBeUndefined();
    });

    it('should create an event with all event types', async () => {
      const eventTypes = Object.values(NotificationEventType);

      for (const type of eventTypes) {
        const eventData = createValidEvent({ type });
        const event = await repository.createEvent(ctx, eventData);
        expect(event.type).toBe(type);
      }
    });
  });

  describe('findEventById', () => {
    it('should return undefined when event does not exist', async () => {
      const event = await repository.findEventById(ctx, 'non-existent-id');
      expect(event).toBeUndefined();
    });

    it('should find event by id', async () => {
      const created = await repository.createEvent(ctx, createValidEvent());

      const found = await repository.findEventById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.type).toBe(created.type);
    });
  });

  describe('findPendingEvents', () => {
    it('should return empty array when no pending events exist', async () => {
      const events = await repository.findPendingEvents(ctx);
      expect(events).toEqual([]);
    });

    it('should return only pending events', async () => {
      await repository.createEvent(ctx, createValidEvent({ status: NotificationEventStatus.PENDING }));
      await repository.createEvent(ctx, createValidEvent({ status: NotificationEventStatus.PROCESSING }));
      await repository.createEvent(ctx, createValidEvent({ status: NotificationEventStatus.COMPLETED }));

      const events = await repository.findPendingEvents(ctx);

      expect(events).toHaveLength(1);
      expect(events[0].status).toBe(NotificationEventStatus.PENDING);
    });

    it('should order pending events by triggeredAt ascending', async () => {
      const olderDate = new Date('2025-01-01T10:00:00Z');
      const newerDate = new Date('2025-01-02T10:00:00Z');

      await repository.createEvent(ctx, createValidEvent({ triggeredAt: newerDate }));
      await repository.createEvent(ctx, createValidEvent({ triggeredAt: olderDate }));

      const events = await repository.findPendingEvents(ctx);

      expect(events).toHaveLength(2);
      expect(events[0].triggeredAt.getTime()).toBeLessThan(events[1].triggeredAt.getTime());
    });
  });

  describe('updateEvent', () => {
    it('should return undefined for non-existent event', async () => {
      const result = await repository.updateEvent(ctx, 'non-existent-id', {
        status: NotificationEventStatus.COMPLETED,
      });
      expect(result).toBeUndefined();
    });

    it('should update event status', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());

      const updated = await repository.updateEvent(ctx, event.id, {
        status: NotificationEventStatus.PROCESSING,
      });

      expect(updated?.status).toBe(NotificationEventStatus.PROCESSING);
    });

    it('should update event processedAt', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const processedAt = new Date();

      const updated = await repository.updateEvent(ctx, event.id, { processedAt });

      expect(updated?.processedAt).toEqual(processedAt);
    });

    it('should update event error', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const error = 'Processing failed due to timeout';

      const updated = await repository.updateEvent(ctx, event.id, { error });

      expect(updated?.error).toBe(error);
    });
  });

  describe('getEventsPaginated', () => {
    it('should return empty result when no events exist', async () => {
      const result = await repository.getEventsPaginated(ctx, 1, 10);

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return paginated events', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.createEvent(ctx, createValidEvent());
      }

      const result = await repository.getEventsPaginated(ctx, 1, 2);

      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should return correct page', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.createEvent(ctx, createValidEvent());
      }

      const page1 = await repository.getEventsPaginated(ctx, 1, 2);
      const page2 = await repository.getEventsPaginated(ctx, 2, 2);
      const page3 = await repository.getEventsPaginated(ctx, 3, 2);

      expect(page1.events).toHaveLength(2);
      expect(page2.events).toHaveLength(2);
      expect(page3.events).toHaveLength(1);
    });

    it('should filter by type', async () => {
      await repository.createEvent(ctx, createValidEvent({ type: NotificationEventType.PAYMENT_REQUIRED }));
      await repository.createEvent(ctx, createValidEvent({ type: NotificationEventType.DISPUTE_OPENED }));

      const result = await repository.getEventsPaginated(ctx, 1, 10, {
        type: NotificationEventType.PAYMENT_REQUIRED,
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe(NotificationEventType.PAYMENT_REQUIRED);
    });

    it('should filter by status', async () => {
      await repository.createEvent(ctx, createValidEvent({ status: NotificationEventStatus.PENDING }));
      await repository.createEvent(ctx, createValidEvent({ status: NotificationEventStatus.COMPLETED }));

      const result = await repository.getEventsPaginated(ctx, 1, 10, {
        status: NotificationEventStatus.PENDING,
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe(NotificationEventStatus.PENDING);
    });

    it('should filter by date range', async () => {
      const oldDate = new Date('2025-01-01T10:00:00Z');
      const midDate = new Date('2025-06-01T10:00:00Z');
      const newDate = new Date('2025-12-01T10:00:00Z');

      await repository.createEvent(ctx, createValidEvent({ triggeredAt: oldDate }));
      await repository.createEvent(ctx, createValidEvent({ triggeredAt: midDate }));
      await repository.createEvent(ctx, createValidEvent({ triggeredAt: newDate }));

      const result = await repository.getEventsPaginated(ctx, 1, 10, {
        from: new Date('2025-03-01'),
        to: new Date('2025-09-01'),
      });

      expect(result.events).toHaveLength(1);
    });

    it('should order events by triggeredAt descending', async () => {
      const olderDate = new Date('2025-01-01T10:00:00Z');
      const newerDate = new Date('2025-06-01T10:00:00Z');

      await repository.createEvent(ctx, createValidEvent({ triggeredAt: olderDate }));
      await repository.createEvent(ctx, createValidEvent({ triggeredAt: newerDate }));

      const result = await repository.getEventsPaginated(ctx, 1, 10);

      expect(result.events[0].triggeredAt.getTime()).toBeGreaterThan(
        result.events[1].triggeredAt.getTime(),
      );
    });
  });

  describe('claimPendingEvent', () => {
    it('should return undefined for non-existent event', async () => {
      const result = await repository.claimPendingEvent(ctx, 'non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-pending event', async () => {
      const event = await repository.createEvent(
        ctx,
        createValidEvent({ status: NotificationEventStatus.PROCESSING }),
      );

      const result = await repository.claimPendingEvent(ctx, event.id);

      expect(result).toBeUndefined();
    });

    it('should claim pending event and update status to processing', async () => {
      const event = await repository.createEvent(
        ctx,
        createValidEvent({ status: NotificationEventStatus.PENDING }),
      );

      const claimed = await repository.claimPendingEvent(ctx, event.id);

      expect(claimed).toBeDefined();
      expect(claimed?.status).toBe(NotificationEventStatus.PROCESSING);
    });

    it('should be atomic - second claim fails', async () => {
      const event = await repository.createEvent(
        ctx,
        createValidEvent({ status: NotificationEventStatus.PENDING }),
      );

      const firstClaim = await repository.claimPendingEvent(ctx, event.id);
      const secondClaim = await repository.claimPendingEvent(ctx, event.id);

      expect(firstClaim).toBeDefined();
      expect(secondClaim).toBeUndefined();
    });
  });

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const notificationData = createValidNotification(event.id);

      const notification = await repository.createNotification(ctx, notificationData);

      expect(notification).toBeDefined();
      expect(notification.id).toBe(notificationData.id);
      expect(notification.eventId).toBe(event.id);
      expect(notification.channel).toBe(NotificationChannel.IN_APP);
      expect(notification.status).toBe(NotificationStatus.PENDING);
    });

    it('should create an email notification', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const notificationData = createValidNotification(event.id, {
        channel: NotificationChannel.EMAIL,
      });

      const notification = await repository.createNotification(ctx, notificationData);

      expect(notification.channel).toBe(NotificationChannel.EMAIL);
    });

    it('should create notification with all fields', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const now = new Date();
      const notificationData = createValidNotification(event.id, {
        actionUrl: 'https://example.com/action',
        read: true,
        readAt: now,
        sentAt: now,
        deliveredAt: now,
        retryCount: 2,
        nextRetryAt: new Date(now.getTime() + 60000),
      });

      const notification = await repository.createNotification(ctx, notificationData);

      expect(notification.actionUrl).toBe('https://example.com/action');
      expect(notification.read).toBe(true);
      expect(notification.readAt).toEqual(now);
      expect(notification.sentAt).toEqual(now);
      expect(notification.deliveredAt).toEqual(now);
      expect(notification.retryCount).toBe(2);
    });
  });

  describe('findNotificationById', () => {
    it('should return undefined when notification does not exist', async () => {
      const notification = await repository.findNotificationById(ctx, 'non-existent-id');
      expect(notification).toBeUndefined();
    });

    it('should find notification by id', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const created = await repository.createNotification(ctx, createValidNotification(event.id));

      const found = await repository.findNotificationById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('findNotificationsByEventId', () => {
    it('should return empty array when no notifications exist', async () => {
      const notifications = await repository.findNotificationsByEventId(ctx, 'non-existent-id');
      expect(notifications).toEqual([]);
    });

    it('should find all notifications for an event', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { channel: NotificationChannel.IN_APP }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { channel: NotificationChannel.EMAIL }),
      );

      const notifications = await repository.findNotificationsByEventId(ctx, event.id);

      expect(notifications).toHaveLength(2);
    });
  });

  describe('findUserInAppNotifications', () => {
    it('should return empty result when no notifications exist', async () => {
      const result = await repository.findUserInAppNotifications(ctx, testUserId, 1, 10, false);

      expect(result.notifications).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return only in-app notifications for user', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { channel: NotificationChannel.IN_APP }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { channel: NotificationChannel.EMAIL }),
      );

      const result = await repository.findUserInAppNotifications(ctx, testUserId, 1, 10, false);

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].channel).toBe(NotificationChannel.IN_APP);
    });

    it('should filter unread only', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { read: false }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { read: true }),
      );

      const result = await repository.findUserInAppNotifications(ctx, testUserId, 1, 10, true);

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].read).toBe(false);
    });

    it('should paginate results', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      for (let i = 0; i < 5; i++) {
        await repository.createNotification(ctx, createValidNotification(event.id));
      }

      const result = await repository.findUserInAppNotifications(ctx, testUserId, 1, 2, false);

      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should order by createdAt descending', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const olderDate = new Date('2025-01-01T10:00:00Z');
      const newerDate = new Date('2025-06-01T10:00:00Z');

      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { createdAt: olderDate }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { createdAt: newerDate }),
      );

      const result = await repository.findUserInAppNotifications(ctx, testUserId, 1, 10, false);

      expect(result.notifications[0].createdAt.getTime()).toBeGreaterThan(
        result.notifications[1].createdAt.getTime(),
      );
    });

    it('should not return notifications for other users', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const otherUserId = await createTestUser();

      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { recipientId: otherUserId }),
      );

      const result = await repository.findUserInAppNotifications(ctx, testUserId, 1, 10, false);

      expect(result.notifications).toHaveLength(0);
    });
  });

  describe('countUnreadNotifications', () => {
    it('should return 0 when no unread notifications', async () => {
      const count = await repository.countUnreadNotifications(ctx, testUserId);
      expect(count).toBe(0);
    });

    it('should count only unread in-app notifications', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { read: false, channel: NotificationChannel.IN_APP }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { read: true, channel: NotificationChannel.IN_APP }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { read: false, channel: NotificationChannel.EMAIL }),
      );

      const count = await repository.countUnreadNotifications(ctx, testUserId);

      expect(count).toBe(1);
    });
  });

  describe('updateNotification', () => {
    it('should return undefined for non-existent notification', async () => {
      const result = await repository.updateNotification(ctx, 'non-existent-id', {
        status: NotificationStatus.SENT,
      });
      expect(result).toBeUndefined();
    });

    it('should update notification status', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const notification = await repository.createNotification(
        ctx,
        createValidNotification(event.id),
      );

      const updated = await repository.updateNotification(ctx, notification.id, {
        status: NotificationStatus.SENT,
      });

      expect(updated?.status).toBe(NotificationStatus.SENT);
    });

    it('should update notification read status', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const notification = await repository.createNotification(
        ctx,
        createValidNotification(event.id),
      );
      const readAt = new Date();

      const updated = await repository.updateNotification(ctx, notification.id, {
        read: true,
        readAt,
      });

      expect(updated?.read).toBe(true);
      expect(updated?.readAt).toEqual(readAt);
    });

    it('should update notification delivery tracking', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const notification = await repository.createNotification(
        ctx,
        createValidNotification(event.id),
      );
      const sentAt = new Date();
      const deliveredAt = new Date();

      const updated = await repository.updateNotification(ctx, notification.id, {
        sentAt,
        deliveredAt,
      });

      expect(updated?.sentAt).toEqual(sentAt);
      expect(updated?.deliveredAt).toEqual(deliveredAt);
    });

    it('should update notification failure info', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const notification = await repository.createNotification(
        ctx,
        createValidNotification(event.id),
      );
      const failedAt = new Date();

      const updated = await repository.updateNotification(ctx, notification.id, {
        status: NotificationStatus.FAILED,
        failedAt,
        failureReason: 'Email delivery failed',
        retryCount: 1,
        nextRetryAt: new Date(failedAt.getTime() + 60000),
      });

      expect(updated?.status).toBe(NotificationStatus.FAILED);
      expect(updated?.failedAt).toEqual(failedAt);
      expect(updated?.failureReason).toBe('Email delivery failed');
      expect(updated?.retryCount).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should return 0 when no unread notifications', async () => {
      const count = await repository.markAllAsRead(ctx, testUserId);
      expect(count).toBe(0);
    });

    it('should mark all unread in-app notifications as read', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { read: false, channel: NotificationChannel.IN_APP }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { read: false, channel: NotificationChannel.IN_APP }),
      );

      const count = await repository.markAllAsRead(ctx, testUserId);

      expect(count).toBe(2);
    });

    it('should not affect email notifications', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { read: false, channel: NotificationChannel.EMAIL }),
      );

      const count = await repository.markAllAsRead(ctx, testUserId);

      expect(count).toBe(0);
    });

    it('should not affect other users notifications', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const otherUserId = await createTestUser();
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          read: false,
          channel: NotificationChannel.IN_APP,
          recipientId: otherUserId,
        }),
      );

      const count = await repository.markAllAsRead(ctx, testUserId);

      expect(count).toBe(0);
    });
  });

  describe('findPendingEmailNotifications', () => {
    it('should return empty array when no pending email notifications', async () => {
      const notifications = await repository.findPendingEmailNotifications(ctx);
      expect(notifications).toEqual([]);
    });

    it('should return only pending email notifications', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
        }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.SENT,
        }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.PENDING,
        }),
      );

      const notifications = await repository.findPendingEmailNotifications(ctx);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].channel).toBe(NotificationChannel.EMAIL);
      expect(notifications[0].status).toBe(NotificationStatus.PENDING);
    });
  });

  describe('findRetryableEmailNotifications', () => {
    it('should return empty array when no retryable notifications', async () => {
      const notifications = await repository.findRetryableEmailNotifications(ctx);
      expect(notifications).toEqual([]);
    });

    it('should return failed email notifications with retryCount < 3 and past nextRetryAt', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const pastDate = new Date(Date.now() - 60000);

      await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED,
          retryCount: 1,
          nextRetryAt: pastDate,
        }),
      );

      const notifications = await repository.findRetryableEmailNotifications(ctx);

      expect(notifications).toHaveLength(1);
    });

    it('should not return notifications with retryCount >= 3', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const pastDate = new Date(Date.now() - 60000);

      await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED,
          retryCount: 3,
          nextRetryAt: pastDate,
        }),
      );

      const notifications = await repository.findRetryableEmailNotifications(ctx);

      expect(notifications).toHaveLength(0);
    });

    it('should not return notifications with future nextRetryAt', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const futureDate = new Date(Date.now() + 60000);

      await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED,
          retryCount: 1,
          nextRetryAt: futureDate,
        }),
      );

      const notifications = await repository.findRetryableEmailNotifications(ctx);

      expect(notifications).toHaveLength(0);
    });
  });

  describe('deleteOldNotifications', () => {
    it('should return 0 when no old notifications', async () => {
      const count = await repository.deleteOldNotifications(ctx);
      expect(count).toBe(0);
    });

    it('should delete notifications older than retention period', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);

      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { createdAt: oldDate }),
      );
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, { createdAt: new Date() }),
      );

      const count = await repository.deleteOldNotifications(ctx);

      expect(count).toBe(1);

      const remaining = await repository.findNotificationsByEventId(ctx, event.id);
      expect(remaining).toHaveLength(1);
    });
  });

  describe('claimPendingEmailNotifications', () => {
    it('should return empty array when no pending notifications', async () => {
      const notifications = await repository.claimPendingEmailNotifications(ctx, 10);
      expect(notifications).toEqual([]);
    });

    it('should claim up to limit pending email notifications', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      for (let i = 0; i < 5; i++) {
        await repository.createNotification(
          ctx,
          createValidNotification(event.id, {
            channel: NotificationChannel.EMAIL,
            status: NotificationStatus.PENDING,
          }),
        );
      }

      const claimed = await repository.claimPendingEmailNotifications(ctx, 3);

      expect(claimed).toHaveLength(3);
      claimed.forEach((n) => {
        expect(n.status).toBe(NotificationStatus.QUEUED);
      });
    });

    it('should not claim already queued notifications', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
        }),
      );

      const firstClaim = await repository.claimPendingEmailNotifications(ctx, 10);
      const secondClaim = await repository.claimPendingEmailNotifications(ctx, 10);

      expect(firstClaim).toHaveLength(1);
      expect(secondClaim).toHaveLength(0);
    });
  });

  describe('claimRetryableEmailNotification', () => {
    it('should return undefined for non-existent notification', async () => {
      const result = await repository.claimRetryableEmailNotification(ctx, 'non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-retryable notification', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const notification = await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.SENT,
        }),
      );

      const result = await repository.claimRetryableEmailNotification(ctx, notification.id);

      expect(result).toBeUndefined();
    });

    it('should claim retryable notification and update to queued', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const pastDate = new Date(Date.now() - 60000);
      const notification = await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED,
          retryCount: 1,
          nextRetryAt: pastDate,
        }),
      );

      const claimed = await repository.claimRetryableEmailNotification(ctx, notification.id);

      expect(claimed).toBeDefined();
      expect(claimed?.status).toBe(NotificationStatus.QUEUED);
      expect(claimed?.nextRetryAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not claim notification with retryCount >= 3', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const pastDate = new Date(Date.now() - 60000);
      const notification = await repository.createNotification(
        ctx,
        createValidNotification(event.id, {
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.FAILED,
          retryCount: 3,
          nextRetryAt: pastDate,
        }),
      );

      const claimed = await repository.claimRetryableEmailNotification(ctx, notification.id);

      expect(claimed).toBeUndefined();
    });
  });

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  describe('createTemplate', () => {
    it('should create a template', async () => {
      const templateData = createValidTemplate();

      const template = await repository.createTemplate(ctx, templateData);

      expect(template).toBeDefined();
      expect(template.id).toBe(templateData.id);
      expect(template.eventType).toBe(NotificationEventType.PAYMENT_REQUIRED);
      expect(template.channel).toBe(NotificationChannel.IN_APP);
      expect(template.locale).toBe('en');
      expect(template.isActive).toBe(true);
    });

    it('should create template with all fields', async () => {
      const templateData = createValidTemplate({
        actionUrlTemplate: 'https://example.com/action/{{id}}',
        updatedBy: testUserId,
      });

      const template = await repository.createTemplate(ctx, templateData);

      expect(template.actionUrlTemplate).toBe('https://example.com/action/{{id}}');
      expect(template.updatedBy).toBe(testUserId);
    });
  });

  describe('findTemplateById', () => {
    it('should return undefined when template does not exist', async () => {
      const template = await repository.findTemplateById(ctx, 'non-existent-id');
      expect(template).toBeUndefined();
    });

    it('should find template by id', async () => {
      const created = await repository.createTemplate(ctx, createValidTemplate());

      const found = await repository.findTemplateById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('findTemplate', () => {
    it('should return undefined when template does not exist', async () => {
      const template = await repository.findTemplate(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        NotificationChannel.IN_APP,
        'en',
      );
      expect(template).toBeUndefined();
    });

    it('should find template by eventType, channel, and locale', async () => {
      await repository.createTemplate(ctx, createValidTemplate());

      const found = await repository.findTemplate(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        NotificationChannel.IN_APP,
        'en',
      );

      expect(found).toBeDefined();
      expect(found?.eventType).toBe(NotificationEventType.PAYMENT_REQUIRED);
      expect(found?.channel).toBe(NotificationChannel.IN_APP);
      expect(found?.locale).toBe('en');
    });

    it('should not find inactive template', async () => {
      await repository.createTemplate(ctx, createValidTemplate({ isActive: false }));

      const found = await repository.findTemplate(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        NotificationChannel.IN_APP,
        'en',
      );

      expect(found).toBeUndefined();
    });

    it('should find correct template among multiple', async () => {
      await repository.createTemplate(
        ctx,
        createValidTemplate({
          eventType: NotificationEventType.PAYMENT_REQUIRED,
          channel: NotificationChannel.IN_APP,
          locale: 'en',
        }),
      );
      await repository.createTemplate(
        ctx,
        createValidTemplate({
          eventType: NotificationEventType.PAYMENT_REQUIRED,
          channel: NotificationChannel.EMAIL,
          locale: 'en',
        }),
      );
      await repository.createTemplate(
        ctx,
        createValidTemplate({
          eventType: NotificationEventType.DISPUTE_OPENED,
          channel: NotificationChannel.IN_APP,
          locale: 'en',
        }),
      );

      const found = await repository.findTemplate(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        NotificationChannel.EMAIL,
        'en',
      );

      expect(found?.eventType).toBe(NotificationEventType.PAYMENT_REQUIRED);
      expect(found?.channel).toBe(NotificationChannel.EMAIL);
    });
  });

  describe('findAllTemplates', () => {
    it('should return empty array when no templates exist', async () => {
      const templates = await repository.findAllTemplates(ctx);
      expect(templates).toEqual([]);
    });

    it('should return all templates', async () => {
      await repository.createTemplate(ctx, createValidTemplate());
      await repository.createTemplate(
        ctx,
        createValidTemplate({ eventType: NotificationEventType.DISPUTE_OPENED }),
      );

      const templates = await repository.findAllTemplates(ctx);

      expect(templates).toHaveLength(2);
    });
  });

  describe('updateTemplate', () => {
    it('should return undefined for non-existent template', async () => {
      const result = await repository.updateTemplate(ctx, 'non-existent-id', {
        titleTemplate: 'New Title',
      });
      expect(result).toBeUndefined();
    });

    it('should update template title', async () => {
      const template = await repository.createTemplate(ctx, createValidTemplate());

      const updated = await repository.updateTemplate(ctx, template.id, {
        titleTemplate: 'Updated Title',
      });

      expect(updated?.titleTemplate).toBe('Updated Title');
    });

    it('should update template body', async () => {
      const template = await repository.createTemplate(ctx, createValidTemplate());

      const updated = await repository.updateTemplate(ctx, template.id, {
        bodyTemplate: 'Updated body content',
      });

      expect(updated?.bodyTemplate).toBe('Updated body content');
    });

    it('should update template isActive status', async () => {
      const template = await repository.createTemplate(ctx, createValidTemplate({ isActive: true }));

      const updated = await repository.updateTemplate(ctx, template.id, {
        isActive: false,
      });

      expect(updated?.isActive).toBe(false);
    });

    it('should update template updatedBy', async () => {
      const template = await repository.createTemplate(ctx, createValidTemplate());

      const updated = await repository.updateTemplate(ctx, template.id, {
        updatedBy: testUserId,
      });

      expect(updated?.updatedBy).toBe(testUserId);
    });

    it('should update multiple fields', async () => {
      const template = await repository.createTemplate(ctx, createValidTemplate());

      const updated = await repository.updateTemplate(ctx, template.id, {
        titleTemplate: 'New Title',
        bodyTemplate: 'New Body',
        actionUrlTemplate: 'https://new-url.com',
        isActive: false,
      });

      expect(updated?.titleTemplate).toBe('New Title');
      expect(updated?.bodyTemplate).toBe('New Body');
      expect(updated?.actionUrlTemplate).toBe('https://new-url.com');
      expect(updated?.isActive).toBe(false);
    });
  });

  // ==========================================================================
  // CHANNEL CONFIG
  // ==========================================================================

  describe('createChannelConfig', () => {
    it('should create a channel config', async () => {
      const configData = createValidChannelConfig();

      const config = await repository.createChannelConfig(ctx, configData);

      expect(config).toBeDefined();
      expect(config.id).toBe(configData.id);
      expect(config.eventType).toBe(NotificationEventType.PAYMENT_REQUIRED);
      expect(config.inAppEnabled).toBe(true);
      expect(config.emailEnabled).toBe(true);
      expect(config.priority).toBe(NotificationPriority.NORMAL);
    });

    it('should create config with different priority levels', async () => {
      const priorities = Object.values(NotificationPriority);

      for (const priority of priorities) {
        await truncateAllTables(prisma);
        const configData = createValidChannelConfig({ priority });
        const config = await repository.createChannelConfig(ctx, configData);
        expect(config.priority).toBe(priority);
      }
    });
  });

  describe('findChannelConfig', () => {
    it('should return undefined when config does not exist', async () => {
      const config = await repository.findChannelConfig(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
      );
      expect(config).toBeUndefined();
    });

    it('should find config by eventType', async () => {
      await repository.createChannelConfig(ctx, createValidChannelConfig());

      const found = await repository.findChannelConfig(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
      );

      expect(found).toBeDefined();
      expect(found?.eventType).toBe(NotificationEventType.PAYMENT_REQUIRED);
    });
  });

  describe('findAllChannelConfigs', () => {
    it('should return empty array when no configs exist', async () => {
      const configs = await repository.findAllChannelConfigs(ctx);
      expect(configs).toEqual([]);
    });

    it('should return all channel configs', async () => {
      await repository.createChannelConfig(
        ctx,
        createValidChannelConfig({ eventType: NotificationEventType.PAYMENT_REQUIRED }),
      );
      await repository.createChannelConfig(
        ctx,
        createValidChannelConfig({ eventType: NotificationEventType.DISPUTE_OPENED }),
      );

      const configs = await repository.findAllChannelConfigs(ctx);

      expect(configs).toHaveLength(2);
    });
  });

  describe('updateChannelConfig', () => {
    it('should return undefined for non-existent config', async () => {
      const result = await repository.updateChannelConfig(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        { inAppEnabled: false },
      );
      expect(result).toBeUndefined();
    });

    it('should update inAppEnabled', async () => {
      await repository.createChannelConfig(ctx, createValidChannelConfig({ inAppEnabled: true }));

      const updated = await repository.updateChannelConfig(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        { inAppEnabled: false },
      );

      expect(updated?.inAppEnabled).toBe(false);
    });

    it('should update emailEnabled', async () => {
      await repository.createChannelConfig(ctx, createValidChannelConfig({ emailEnabled: true }));

      const updated = await repository.updateChannelConfig(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        { emailEnabled: false },
      );

      expect(updated?.emailEnabled).toBe(false);
    });

    it('should update priority', async () => {
      await repository.createChannelConfig(
        ctx,
        createValidChannelConfig({ priority: NotificationPriority.NORMAL }),
      );

      const updated = await repository.updateChannelConfig(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        { priority: NotificationPriority.HIGH },
      );

      expect(updated?.priority).toBe(NotificationPriority.HIGH);
    });

    it('should update updatedBy', async () => {
      await repository.createChannelConfig(ctx, createValidChannelConfig());

      const updated = await repository.updateChannelConfig(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        { updatedBy: testUserId },
      );

      expect(updated?.updatedBy).toBe(testUserId);
    });

    it('should update multiple fields', async () => {
      await repository.createChannelConfig(ctx, createValidChannelConfig());

      const updated = await repository.updateChannelConfig(
        ctx,
        NotificationEventType.PAYMENT_REQUIRED,
        {
          inAppEnabled: false,
          emailEnabled: false,
          priority: NotificationPriority.URGENT,
          updatedBy: testUserId,
        },
      );

      expect(updated?.inAppEnabled).toBe(false);
      expect(updated?.emailEnabled).toBe(false);
      expect(updated?.priority).toBe(NotificationPriority.URGENT);
      expect(updated?.updatedBy).toBe(testUserId);
    });
  });
});
