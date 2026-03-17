import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Ctx } from '../../../../src/common/types/context';
import { EventScoringService } from '../../../../src/modules/event-scoring/event-scoring.service';
import { EventScoringRepository } from '../../../../src/modules/event-scoring/event-scoring.repository';
import { EventsService } from '../../../../src/modules/events/events.service';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

describe('EventScoringService', () => {
  let service: EventScoringService;
  let repository: jest.Mocked<EventScoringRepository>;
  let eventsService: jest.Mocked<EventsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let mockConfigGet: jest.Mock;

  beforeEach(async () => {
    const mockRepository = {
      enqueueEvent: jest.fn(),
      getPendingEventIds: jest.fn(),
      removeFromQueue: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
    };

    const mockEventsService = {
      getEventRankingComponentsBatch: jest.fn(),
      updateEventRankingBatch: jest.fn(),
    };

    const mockTransactionsService = {
      getCompletedTransactionCountByEventIds: jest.fn(),
    };

    mockConfigGet = jest.fn((key: string) => {
      if (key === 'eventScoring.cityWeights') return {};
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventScoringService,
        { provide: EventScoringRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: { get: mockConfigGet } },
        { provide: EventsService, useValue: mockEventsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    service = module.get<EventScoringService>(EventScoringService);
    repository = module.get(EventScoringRepository);
    eventsService = module.get(EventsService);
    transactionsService = module.get(TransactionsService);
  });

  describe('requestScoring', () => {
    it('should enqueue event for scoring', async () => {
      repository.enqueueEvent.mockResolvedValue(undefined);

      await service.requestScoring(mockCtx, 'event-123');

      expect(repository.enqueueEvent).toHaveBeenCalledWith(mockCtx, 'event-123');
    });

    it('should not throw when enqueueEvent fails', async () => {
      repository.enqueueEvent.mockRejectedValue(new Error('DB error'));

      await expect(
        service.requestScoring(mockCtx, 'event-123'),
      ).resolves.toBeUndefined();
    });
  });

  describe('requestScoringBatch', () => {
    it('should enqueue all events and return count', async () => {
      repository.enqueueEvent.mockResolvedValue(undefined);

      const result = await service.requestScoringBatch(mockCtx, [
        'event-1',
        'event-2',
        'event-3',
      ]);

      expect(result.enqueued).toBe(3);
      expect(repository.enqueueEvent).toHaveBeenCalledTimes(3);
      expect(repository.enqueueEvent).toHaveBeenNthCalledWith(1, mockCtx, 'event-1');
      expect(repository.enqueueEvent).toHaveBeenNthCalledWith(2, mockCtx, 'event-2');
      expect(repository.enqueueEvent).toHaveBeenNthCalledWith(3, mockCtx, 'event-3');
    });

    it('should return enqueued 0 when eventIds is empty', async () => {
      const result = await service.requestScoringBatch(mockCtx, []);

      expect(result.enqueued).toBe(0);
      expect(repository.enqueueEvent).not.toHaveBeenCalled();
    });

    it('should return enqueued 0 and not throw when enqueueEvent fails', async () => {
      repository.enqueueEvent.mockRejectedValue(new Error('DB error'));

      const result = await service.requestScoringBatch(mockCtx, ['event-1']);

      expect(result.enqueued).toBe(0);
    });
  });

  describe('getConfig', () => {
    it('should return config when row exists', async () => {
      const row = {
        weightActiveListings: 1,
        weightTransactions: 1,
        weightProximity: 0.5,
        weightPopular: 1,
        jobIntervalMinutes: 5,
        lastRunAt: new Date('2025-01-01T12:00:00Z'),
        updatedAt: new Date('2025-01-01T12:00:00Z'),
      };
      repository.getConfig.mockResolvedValue(row);

      const result = await service.getConfig(mockCtx);

      expect(result).toEqual({
        weightActiveListings: 1,
        weightTransactions: 1,
        weightProximity: 0.5,
        weightPopular: 1,
        jobIntervalMinutes: 5,
        lastRunAt: '2025-01-01T12:00:00.000Z',
        updatedAt: '2025-01-01T12:00:00.000Z',
      });
    });

    it('should throw when config row is missing', async () => {
      repository.getConfig.mockResolvedValue(null);

      await expect(service.getConfig(mockCtx)).rejects.toThrow(
        'Events ranking config not found',
      );
    });
  });

  describe('updateConfig', () => {
    it('should update and return config', async () => {
      const updated = {
        weightActiveListings: 2,
        weightTransactions: 1,
        weightProximity: 0.5,
        weightPopular: 1,
        jobIntervalMinutes: 10,
        lastRunAt: null,
        updatedAt: new Date('2025-01-01T12:00:00Z'),
      };
      repository.updateConfig.mockResolvedValue(updated);

      const result = await service.updateConfig(mockCtx, {
        weightActiveListings: 2,
        jobIntervalMinutes: 10,
      });

      expect(repository.updateConfig).toHaveBeenCalledWith(mockCtx, {
        weightActiveListings: 2,
        jobIntervalMinutes: 10,
      });
      expect(result.lastRunAt).toBe(null);
      expect(result.updatedAt).toBe('2025-01-01T12:00:00.000Z');
    });
  });

  describe('runScoringJob', () => {
    it('should return processed 0 when no config', async () => {
      repository.getConfig.mockResolvedValue(null);

      const result = await service.runScoringJob(mockCtx);

      expect(result.processed).toBe(0);
      expect(repository.getPendingEventIds).not.toHaveBeenCalled();
    });

    it('should return processed 0 when queue is empty', async () => {
      repository.getConfig.mockResolvedValue({
        weightActiveListings: 1,
        weightTransactions: 1,
        weightProximity: 0.5,
        weightPopular: 1,
        jobIntervalMinutes: 5,
        lastRunAt: null,
        updatedAt: new Date(),
      });
      repository.getPendingEventIds.mockResolvedValue([]);

      const result = await service.runScoringJob(mockCtx);

      expect(result.processed).toBe(0);
      expect(eventsService.getEventRankingComponentsBatch).not.toHaveBeenCalled();
      expect(repository.removeFromQueue).not.toHaveBeenCalled();
    });

    it('should process events in batch and update ranking', async () => {
      repository.getConfig.mockResolvedValue({
        weightActiveListings: 1,
        weightTransactions: 1,
        weightProximity: 0.5,
        weightPopular: 1,
        jobIntervalMinutes: 5,
        lastRunAt: null,
        updatedAt: new Date(),
      });
      repository.getPendingEventIds.mockResolvedValue(['e1', 'e2']);
      eventsService.getEventRankingComponentsBatch.mockResolvedValue(
        new Map([
          [
            'e1',
            {
              hasActiveListings: true,
              activeListingsCount: 2,
              nextEventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              isPopular: false,
              city: '',
            },
          ],
          [
            'e2',
            {
              hasActiveListings: false,
              activeListingsCount: 0,
              nextEventDate: null,
              isPopular: false,
              city: '',
            },
          ],
        ]),
      );
      transactionsService.getCompletedTransactionCountByEventIds.mockResolvedValue(
        new Map([
          ['e1', 5],
          ['e2', 0],
        ]),
      );
      eventsService.updateEventRankingBatch.mockResolvedValue(undefined);

      const result = await service.runScoringJob(mockCtx);

      expect(result.processed).toBe(2);
      expect(eventsService.getEventRankingComponentsBatch).toHaveBeenCalledWith(
        mockCtx,
        ['e1', 'e2'],
      );
      expect(transactionsService.getCompletedTransactionCountByEventIds).toHaveBeenCalledWith(
        mockCtx,
        ['e1', 'e2'],
      );
      expect(eventsService.updateEventRankingBatch).toHaveBeenCalledWith(
        mockCtx,
        expect.arrayContaining([
          expect.objectContaining({ eventId: 'e1', rankingScore: expect.any(Number) }),
          expect.objectContaining({ eventId: 'e2', rankingScore: expect.any(Number) }),
        ]),
      );
      expect(repository.removeFromQueue).toHaveBeenCalledWith(
        mockCtx,
        expect.arrayContaining(['e1', 'e2']),
      );
      expect(repository.updateConfig).toHaveBeenCalledWith(mockCtx, {
        lastRunAt: expect.any(Date),
      });
    });

    it('should skip event not found in components map', async () => {
      repository.getConfig.mockResolvedValue({
        weightActiveListings: 1,
        weightTransactions: 1,
        weightProximity: 0.5,
        weightPopular: 1,
        jobIntervalMinutes: 5,
        lastRunAt: null,
        updatedAt: new Date(),
      });
      repository.getPendingEventIds.mockResolvedValue(['e1']);
      eventsService.getEventRankingComponentsBatch.mockResolvedValue(new Map());
      transactionsService.getCompletedTransactionCountByEventIds.mockResolvedValue(new Map());

      const result = await service.runScoringJob(mockCtx);

      expect(result.processed).toBe(0);
      expect(eventsService.updateEventRankingBatch).not.toHaveBeenCalled();
      expect(repository.removeFromQueue).not.toHaveBeenCalled();
    });

    it('should use transaction count 0 when event has no completed transactions', async () => {
      repository.getConfig.mockResolvedValue({
        weightActiveListings: 1,
        weightTransactions: 1,
        weightProximity: 0.5,
        weightPopular: 1,
        jobIntervalMinutes: 5,
        lastRunAt: null,
        updatedAt: new Date(),
      });
      repository.getPendingEventIds.mockResolvedValue(['e1']);
      eventsService.getEventRankingComponentsBatch.mockResolvedValue(
        new Map([
          [
            'e1',
            {
              hasActiveListings: true,
              activeListingsCount: 1,
              nextEventDate: null,
              isPopular: false,
              city: '',
            },
          ],
        ]),
      );
      transactionsService.getCompletedTransactionCountByEventIds.mockResolvedValue(new Map());
      eventsService.updateEventRankingBatch.mockResolvedValue(undefined);

      const result = await service.runScoringJob(mockCtx);

      expect(result.processed).toBe(1);
      expect(eventsService.updateEventRankingBatch).toHaveBeenCalledWith(
        mockCtx,
        expect.arrayContaining([
          expect.objectContaining({
            eventId: 'e1',
            rankingScore: 2, // weightActiveListings (1) + activeListingsCount (1)
            rankingUpdatedAt: expect.any(Date),
          }),
        ]),
      );
    });

    it('should multiply score by city weight when eventScoring.cityWeights is configured', async () => {
      mockConfigGet.mockImplementation((key: string) => {
        if (key === 'eventScoring.cityWeights')
          return { 'Buenos Aires': 2, 'Córdoba': 1.5 };
        return undefined;
      });
      repository.getConfig.mockResolvedValue({
        weightActiveListings: 1,
        weightTransactions: 1,
        weightProximity: 0.5,
        weightPopular: 1,
        jobIntervalMinutes: 5,
        lastRunAt: null,
        updatedAt: new Date(),
      });
      repository.getPendingEventIds.mockResolvedValue(['e1', 'e2']);
      eventsService.getEventRankingComponentsBatch.mockResolvedValue(
        new Map([
          [
            'e1',
            {
              hasActiveListings: true,
              activeListingsCount: 1,
              nextEventDate: null,
              isPopular: false,
              city: 'Buenos Aires',
            },
          ],
          [
            'e2',
            {
              hasActiveListings: true,
              activeListingsCount: 1,
              nextEventDate: null,
              isPopular: false,
              city: 'Unknown City',
            },
          ],
        ]),
      );
      transactionsService.getCompletedTransactionCountByEventIds.mockResolvedValue(new Map());
      eventsService.updateEventRankingBatch.mockResolvedValue(undefined);

      const result = await service.runScoringJob(mockCtx);

      expect(result.processed).toBe(2);
      const updateCalls = eventsService.updateEventRankingBatch.mock.calls[0][1];
      const e1Update = updateCalls.find((u: { eventId: string }) => u.eventId === 'e1');
      const e2Update = updateCalls.find((u: { eventId: string }) => u.eventId === 'e2');
      // Base score for both: 1 (weightActiveListings) + 1 (activeListingsCount) = 2.
      expect(e1Update.rankingScore).toBe(4); // 2 * city weight 2
      expect(e2Update.rankingScore).toBe(2); // 2 * default weight 1 (city not in map)
    });
  });
});
