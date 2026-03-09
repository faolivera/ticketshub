import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../../../../src/modules/notifications/notifications.service';
import {
  INotificationsRepository,
  NOTIFICATIONS_REPOSITORY,
} from '../../../../src/modules/notifications/notifications.repository.interface';
import type { Ctx } from '../../../../src/common/types/context';
import type {
  NotificationEvent,
  Notification,
} from '../../../../src/modules/notifications/notifications.domain';
import {
  NotificationEventType,
  NotificationEventStatus,
  NotificationStatus,
  NotificationChannel,
} from '../../../../src/modules/notifications/notifications.domain';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<INotificationsRepository>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const createMockEvent = (
    overrides: Partial<NotificationEvent> = {},
  ): NotificationEvent => ({
    id: 'ne_123456_abcd',
    type: NotificationEventType.PAYMENT_REQUIRED,
    context: { transactionId: 'tx_123' },
    triggeredBy: 'user_123',
    triggeredAt: new Date('2024-01-01T10:00:00Z'),
    status: NotificationEventStatus.PENDING,
    ...overrides,
  });

  const createMockNotification = (
    overrides: Partial<Notification> = {},
  ): Notification => ({
    id: 'n_123456_abcd',
    eventId: 'ne_123456_abcd',
    eventType: NotificationEventType.PAYMENT_REQUIRED,
    recipientId: 'user_123',
    channel: NotificationChannel.EMAIL,
    title: 'Test Notification',
    body: 'Test notification body',
    status: NotificationStatus.PENDING,
    read: false,
    retryCount: 0,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<INotificationsRepository>> = {
      createEvent: jest.fn(),
      findEventById: jest.fn(),
      findPendingEvents: jest.fn(),
      updateEvent: jest.fn(),
      getEventsPaginated: jest.fn(),
      createNotification: jest.fn(),
      findNotificationById: jest.fn(),
      findNotificationsByEventId: jest.fn(),
      findUserInAppNotifications: jest.fn(),
      countUnreadNotifications: jest.fn(),
      updateNotification: jest.fn(),
      markAllAsRead: jest.fn(),
      markAsReadBatch: jest.fn(),
      findPendingEmailNotifications: jest.fn(),
      findRetryableEmailNotifications: jest.fn(),
      deleteOldNotifications: jest.fn(),
      createTemplate: jest.fn(),
      findTemplateById: jest.fn(),
      findTemplate: jest.fn(),
      findAllTemplates: jest.fn(),
      updateTemplate: jest.fn(),
      createChannelConfig: jest.fn(),
      findChannelConfig: jest.fn(),
      findAllChannelConfigs: jest.fn(),
      updateChannelConfig: jest.fn(),
      claimPendingEvent: jest.fn(),
      claimPendingEmailNotifications: jest.fn(),
      claimRetryableEmailNotification: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const map: Record<string, unknown> = {
          NODE_ENV: 'test',
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NOTIFICATIONS_REPOSITORY, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(NOTIFICATIONS_REPOSITORY);
  });

  describe('claimEvent', () => {
    it('should return event when successfully claimed', async () => {
      const mockEvent = createMockEvent({
        status: NotificationEventStatus.PROCESSING,
      });
      repository.claimPendingEvent.mockResolvedValue(mockEvent);

      const result = await service.claimEvent(mockCtx, 'ne_123456_abcd');

      expect(result).toEqual(mockEvent);
      expect(repository.claimPendingEvent).toHaveBeenCalledWith(
        mockCtx,
        'ne_123456_abcd',
      );
    });

    it('should return undefined when event already claimed by another worker', async () => {
      repository.claimPendingEvent.mockResolvedValue(undefined);

      const result = await service.claimEvent(mockCtx, 'ne_123456_abcd');

      expect(result).toBeUndefined();
      expect(repository.claimPendingEvent).toHaveBeenCalledWith(
        mockCtx,
        'ne_123456_abcd',
      );
    });

    it('should return undefined when event does not exist', async () => {
      repository.claimPendingEvent.mockResolvedValue(undefined);

      const result = await service.claimEvent(mockCtx, 'ne_nonexistent');

      expect(result).toBeUndefined();
      expect(repository.claimPendingEvent).toHaveBeenCalledWith(
        mockCtx,
        'ne_nonexistent',
      );
    });
  });

  describe('claimPendingEmails', () => {
    it('should return claimed notifications', async () => {
      const mockNotifications = [
        createMockNotification({
          id: 'n_1',
          status: NotificationStatus.QUEUED,
        }),
        createMockNotification({
          id: 'n_2',
          status: NotificationStatus.QUEUED,
        }),
      ];
      repository.claimPendingEmailNotifications.mockResolvedValue(
        mockNotifications,
      );

      const result = await service.claimPendingEmails(mockCtx, 10);

      expect(result).toEqual(mockNotifications);
      expect(repository.claimPendingEmailNotifications).toHaveBeenCalledWith(
        mockCtx,
        10,
      );
    });

    it('should return empty array when no pending emails available', async () => {
      repository.claimPendingEmailNotifications.mockResolvedValue([]);

      const result = await service.claimPendingEmails(mockCtx, 10);

      expect(result).toEqual([]);
      expect(repository.claimPendingEmailNotifications).toHaveBeenCalledWith(
        mockCtx,
        10,
      );
    });

    it('should use default limit of 10 when not specified', async () => {
      repository.claimPendingEmailNotifications.mockResolvedValue([]);

      await service.claimPendingEmails(mockCtx);

      expect(repository.claimPendingEmailNotifications).toHaveBeenCalledWith(
        mockCtx,
        10,
      );
    });
  });

  describe('claimRetryableEmail', () => {
    it('should return notification when successfully claimed for retry', async () => {
      const mockNotification = createMockNotification({
        status: NotificationStatus.QUEUED,
        retryCount: 1,
      });
      repository.claimRetryableEmailNotification.mockResolvedValue(
        mockNotification,
      );

      const result = await service.claimRetryableEmail(
        mockCtx,
        'n_123456_abcd',
      );

      expect(result).toEqual(mockNotification);
      expect(repository.claimRetryableEmailNotification).toHaveBeenCalledWith(
        mockCtx,
        'n_123456_abcd',
      );
    });

    it('should return undefined when notification already being retried', async () => {
      repository.claimRetryableEmailNotification.mockResolvedValue(undefined);

      const result = await service.claimRetryableEmail(
        mockCtx,
        'n_123456_abcd',
      );

      expect(result).toBeUndefined();
      expect(repository.claimRetryableEmailNotification).toHaveBeenCalledWith(
        mockCtx,
        'n_123456_abcd',
      );
    });

    it('should return undefined when notification does not exist', async () => {
      repository.claimRetryableEmailNotification.mockResolvedValue(undefined);

      const result = await service.claimRetryableEmail(
        mockCtx,
        'n_nonexistent',
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when notification has exceeded max retries', async () => {
      repository.claimRetryableEmailNotification.mockResolvedValue(undefined);

      const result = await service.claimRetryableEmail(
        mockCtx,
        'n_123456_abcd',
      );

      expect(result).toBeUndefined();
    });
  });

  describe('markEventCompleted', () => {
    it('should update event status to COMPLETED with processedAt', async () => {
      const mockEvent = createMockEvent({
        status: NotificationEventStatus.COMPLETED,
        processedAt: expect.any(Date),
      });
      repository.updateEvent.mockResolvedValue(mockEvent);

      const result = await service.markEventCompleted(
        mockCtx,
        'ne_123456_abcd',
      );

      expect(result?.status).toBe(NotificationEventStatus.COMPLETED);
      expect(repository.updateEvent).toHaveBeenCalledWith(
        mockCtx,
        'ne_123456_abcd',
        expect.objectContaining({
          status: NotificationEventStatus.COMPLETED,
          processedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('markEventFailed', () => {
    it('should update event status to FAILED with error message', async () => {
      const errorMessage = 'Processing error occurred';
      const mockEvent = createMockEvent({
        status: NotificationEventStatus.FAILED,
        error: errorMessage,
        processedAt: expect.any(Date),
      });
      repository.updateEvent.mockResolvedValue(mockEvent);

      const result = await service.markEventFailed(
        mockCtx,
        'ne_123456_abcd',
        errorMessage,
      );

      expect(result?.status).toBe(NotificationEventStatus.FAILED);
      expect(repository.updateEvent).toHaveBeenCalledWith(
        mockCtx,
        'ne_123456_abcd',
        expect.objectContaining({
          status: NotificationEventStatus.FAILED,
          error: errorMessage,
          processedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getPendingEvents', () => {
    it('should return pending events from repository', async () => {
      const mockEvents = [
        createMockEvent({ id: 'ne_1' }),
        createMockEvent({ id: 'ne_2' }),
      ];
      repository.findPendingEvents.mockResolvedValue(mockEvents);

      const result = await service.getPendingEvents(mockCtx);

      expect(result).toEqual(mockEvents);
      expect(repository.findPendingEvents).toHaveBeenCalledWith(mockCtx);
    });
  });

  describe('getRetryableEmailNotifications', () => {
    it('should return retryable notifications from repository', async () => {
      const mockNotifications = [
        createMockNotification({
          id: 'n_1',
          status: NotificationStatus.FAILED,
          retryCount: 1,
        }),
        createMockNotification({
          id: 'n_2',
          status: NotificationStatus.FAILED,
          retryCount: 2,
        }),
      ];
      repository.findRetryableEmailNotifications.mockResolvedValue(
        mockNotifications,
      );

      const result = await service.getRetryableEmailNotifications(mockCtx);

      expect(result).toEqual(mockNotifications);
      expect(repository.findRetryableEmailNotifications).toHaveBeenCalledWith(
        mockCtx,
      );
    });
  });

  describe('markAsReadBatch', () => {
    it('should return markedCount from repository when given ids', async () => {
      repository.markAsReadBatch.mockResolvedValue(2);

      const result = await service.markAsReadBatch(mockCtx, 'user_123', [
        'n_1',
        'n_2',
      ]);

      expect(result).toEqual({ markedCount: 2 });
      expect(repository.markAsReadBatch).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
        ['n_1', 'n_2'],
      );
    });

    it('should return markedCount 0 when given empty array', async () => {
      const result = await service.markAsReadBatch(mockCtx, 'user_123', []);

      expect(result).toEqual({ markedCount: 0 });
      expect(repository.markAsReadBatch).not.toHaveBeenCalled();
    });

    it('should deduplicate and filter empty ids before calling repository', async () => {
      repository.markAsReadBatch.mockResolvedValue(2);

      await service.markAsReadBatch(mockCtx, 'user_123', [
        'n_1',
        'n_1',
        '',
        'n_2',
      ]);

      expect(repository.markAsReadBatch).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
        ['n_1', 'n_2'],
      );
    });
  });
});
