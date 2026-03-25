import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from '../../../../src/modules/subscriptions/subscriptions.service';
import { SUBSCRIPTIONS_REPOSITORY } from '../../../../src/modules/subscriptions/subscriptions.repository.interface';
import type { ISubscriptionsRepository } from '../../../../src/modules/subscriptions/subscriptions.repository.interface';
import { EventsService } from '../../../../src/modules/events/events.service';
import type { Ctx } from '../../../../src/common/types/context';
import type { EventSubscription } from '../../../../src/modules/subscriptions/subscriptions.domain';
import { SUBSCRIPTION_TYPES } from '../../../../src/modules/subscriptions/subscriptions.domain';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

function makeSubscription(
  overrides: Partial<EventSubscription> = {},
): EventSubscription {
  return {
    id: 'sub_1',
    eventId: 'event_1',
    subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
    userId: null,
    email: 'test@example.com',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let repository: jest.Mocked<ISubscriptionsRepository>;
  let eventsService: jest.Mocked<Pick<EventsService, 'getEventById'>>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      count: jest.fn(),
    };

    eventsService = {
      getEventById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: SUBSCRIPTIONS_REPOSITORY, useValue: repository },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
  });

  describe('subscribe', () => {
    it('subscribes an authenticated user using their injected email', async () => {
      eventsService.getEventById.mockResolvedValue({ id: 'event_1' } as any);
      repository.create.mockResolvedValue(
        makeSubscription({ userId: 'user_1', email: 'user@example.com' }),
      );

      const result = await service.subscribe(
        mockCtx,
        'user_1',
        'user@example.com',
        {
          eventId: 'event_1',
          subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
        },
      );

      expect(result).toEqual({ subscribed: true });
      expect(repository.create).toHaveBeenCalledWith(mockCtx, {
        eventId: 'event_1',
        subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
        userId: 'user_1',
        email: 'user@example.com',
      });
    });

    it('subscribes a guest user using the email from the request body', async () => {
      eventsService.getEventById.mockResolvedValue({ id: 'event_1' } as any);
      repository.create.mockResolvedValue(
        makeSubscription({ email: 'guest@example.com' }),
      );

      const result = await service.subscribe(mockCtx, null, null, {
        eventId: 'event_1',
        subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
        email: 'guest@example.com',
      });

      expect(result).toEqual({ subscribed: true });
      expect(repository.create).toHaveBeenCalledWith(mockCtx, {
        eventId: 'event_1',
        subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
        userId: null,
        email: 'guest@example.com',
      });
    });

    it('returns subscribed:true when subscription already exists (idempotent)', async () => {
      eventsService.getEventById.mockResolvedValue({ id: 'event_1' } as any);
      const uniqueError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });
      repository.create.mockRejectedValue(uniqueError);

      const result = await service.subscribe(mockCtx, null, null, {
        eventId: 'event_1',
        subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
        email: 'guest@example.com',
      });

      expect(result).toEqual({ subscribed: true });
    });

    it('throws NotFoundException when event does not exist', async () => {
      eventsService.getEventById.mockRejectedValue(
        new NotFoundException('Event not found'),
      );

      await expect(
        service.subscribe(mockCtx, null, null, {
          eventId: 'nonexistent',
          subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
          email: 'guest@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for an unknown subscriptionType', async () => {
      await expect(
        service.subscribe(mockCtx, null, null, {
          eventId: 'event_1',
          subscriptionType: 'INVALID_TYPE' as any,
          email: 'guest@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when guest provides no email', async () => {
      await expect(
        service.subscribe(mockCtx, null, null, {
          eventId: 'event_1',
          subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when guest provides an invalid email format', async () => {
      await expect(
        service.subscribe(mockCtx, null, null, {
          eventId: 'event_1',
          subscriptionType: SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
          email: 'not-an-email',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCount', () => {
    it('returns the subscription count for an event', async () => {
      repository.count.mockResolvedValue(42);

      const result = await service.getCount(
        mockCtx,
        'event_1',
        SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
      );

      expect(result).toEqual({ count: 42 });
      expect(repository.count).toHaveBeenCalledWith(
        mockCtx,
        'event_1',
        SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
      );
    });

    it('throws BadRequestException when eventId is missing', async () => {
      await expect(
        service.getCount(mockCtx, '', SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when subscriptionType is missing', async () => {
      await expect(
        service.getCount(mockCtx, 'event_1', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns count:0 when eventId does not reference an existing event', async () => {
      repository.count.mockResolvedValue(0);

      const result = await service.getCount(
        mockCtx,
        'nonexistent_event',
        SUBSCRIPTION_TYPES.NOTIFY_TICKET_AVAILABLE,
      );

      expect(result).toEqual({ count: 0 });
    });
  });
});
