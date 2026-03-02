import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../../../../src/modules/events/events.service';
import { EVENTS_REPOSITORY } from '../../../../src/modules/events/events.repository.interface';
import type { IEventsRepository } from '../../../../src/modules/events/events.repository.interface';
import { IMAGES_REPOSITORY } from '../../../../src/modules/images/images.repository.interface';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { EventBannerStorageService } from '../../../../src/modules/events/event-banner-storage.service';
import {
  EventStatus,
  EventCategory,
} from '../../../../src/modules/events/events.domain';
import type { Event } from '../../../../src/modules/events/events.domain';
import type { Ctx } from '../../../../src/common/types/context';

describe('EventsService - getEventsForSelection', () => {
  let service: EventsService;
  let eventsRepository: jest.Mocked<IEventsRepository>;
  let bannerStorage: jest.Mocked<EventBannerStorageService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const createMockEvent = (overrides: Partial<Event> = {}): Event => ({
    id: `evt_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Event',
    category: EventCategory.Concert,
    venue: 'Test Venue',
    location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
    imageIds: [],
    status: EventStatus.Approved,
    createdBy: 'user_123',
    approvedBy: 'admin_123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockEventsRepository = {
      findEventById: jest.fn(),
      findEventDateById: jest.fn(),
      findEventSectionById: jest.fn(),
      findEventDateByEventIdAndDate: jest.fn(),
      createEvent: jest.fn(),
      createEventDate: jest.fn(),
      updateEvent: jest.fn(),
      updateEventDate: jest.fn(),
      deleteEventDate: jest.fn(),
      deleteEventSection: jest.fn(),
      updateEventSection: jest.fn(),
      createEventSection: jest.fn(),
      getApprovedEvents: jest.fn(),
      getAllEvents: jest.fn(),
      getPendingEvents: jest.fn(),
      getEventsByCreator: jest.fn(),
      getDatesByEventId: jest.fn(),
      getApprovedDatesByEventId: jest.fn(),
      getSectionsByEventId: jest.fn(),
      getApprovedSectionsByEventId: jest.fn(),
      getDatesByEventIdAndStatus: jest.fn(),
      getSectionsByEventIdAndStatus: jest.fn(),
      getAllEventsPaginated: jest.fn(),
      getApprovedEventsForSelection: jest.fn(),
    };

    const mockImagesRepository = {
      getByIds: jest.fn(),
    };

    const mockTicketsService = {
      activatePendingListingsForEvent: jest.fn(),
      activatePendingListingsForEventDate: jest.fn(),
      activatePendingListingsForEventSection: jest.fn(),
      createListing: jest.fn(),
      getListingById: jest.fn(),
      listListings: jest.fn(),
      getListingsByDateId: jest.fn(),
      cancelListingsByDateId: jest.fn(),
      getListingsBySectionId: jest.fn(),
    };

    const mockTransactionsService = {
      hasCompletedTransactionsForListings: jest.fn(),
    };

    const mockBannerStorage = {
      store: jest.fn(),
      delete: jest.fn(),
      deleteByFilename: jest.fn(),
      exists: jest.fn(),
      getPublicUrl: jest.fn(),
      scanExistingBanners: jest.fn(),
      readFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EVENTS_REPOSITORY, useValue: mockEventsRepository },
        { provide: IMAGES_REPOSITORY, useValue: mockImagesRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: EventBannerStorageService, useValue: mockBannerStorage },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventsRepository = module.get(EVENTS_REPOSITORY);
    bannerStorage = module.get(EventBannerStorageService);
  });

  describe('getEventsForSelection', () => {
    it('should return events with default pagination when no query params', async () => {
      const mockEvents = [
        createMockEvent({ id: 'evt_1', name: 'Concert A', venue: 'Arena' }),
        createMockEvent({ id: 'evt_2', name: 'Concert B', venue: 'Stadium' }),
      ];

      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: mockEvents,
        total: 2,
      });

      const result = await service.getEventsForSelection(mockCtx, {});

      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(eventsRepository.getApprovedEventsForSelection).toHaveBeenCalledWith(
        mockCtx,
        { limit: 13, offset: 0, search: undefined },
      );
    });

    it('should apply search filter to repository call', async () => {
      const mockEvents = [
        createMockEvent({ id: 'evt_1', name: 'Rock Concert', venue: 'Arena' }),
      ];

      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: mockEvents,
        total: 1,
      });

      const result = await service.getEventsForSelection(mockCtx, {
        search: 'rock',
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('Rock Concert');
      expect(eventsRepository.getApprovedEventsForSelection).toHaveBeenCalledWith(
        mockCtx,
        { limit: 13, offset: 0, search: 'rock' },
      );
    });

    it('should apply custom limit and offset', async () => {
      const mockEvents = Array.from({ length: 5 }, (_, i) =>
        createMockEvent({ id: `evt_${i}`, name: `Event ${i}` }),
      );

      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: mockEvents,
        total: 20,
      });

      const result = await service.getEventsForSelection(mockCtx, {
        limit: 5,
        offset: 10,
      });

      expect(result.events).toHaveLength(5);
      expect(result.hasMore).toBe(false);
      expect(eventsRepository.getApprovedEventsForSelection).toHaveBeenCalledWith(
        mockCtx,
        { limit: 6, offset: 10, search: undefined },
      );
    });

    it('should set hasMore to true when more events exist', async () => {
      const mockEvents = Array.from({ length: 13 }, (_, i) =>
        createMockEvent({ id: `evt_${i}`, name: `Event ${i}` }),
      );

      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: mockEvents,
        total: 50,
      });

      const result = await service.getEventsForSelection(mockCtx, {
        limit: 12,
      });

      expect(result.events).toHaveLength(12);
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(50);
    });

    it('should include both banner URLs when both banners exist', async () => {
      const eventWithBanners = createMockEvent({
        id: 'evt_with_banners',
        name: 'Event With Banners',
        banners: {
          square: {
            type: 'square',
            filename: 'square.png',
            originalFilename: 'sq-banner.png',
            contentType: 'image/png',
            sizeBytes: 1000,
            width: 300,
            height: 300,
            uploadedBy: 'user_123',
            uploadedAt: new Date(),
          },
          rectangle: {
            type: 'rectangle',
            filename: 'rectangle.png',
            originalFilename: 'banner.png',
            contentType: 'image/png',
            sizeBytes: 1000,
            width: 640,
            height: 360,
            uploadedBy: 'user_123',
            uploadedAt: new Date(),
          },
        },
      });

      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: [eventWithBanners],
        total: 1,
      });
      bannerStorage.getPublicUrl.mockImplementation(
        (eventId: string, filename: string) =>
          `/public/event-banners/${eventId}/${filename}`,
      );

      const result = await service.getEventsForSelection(mockCtx, {});

      expect(result.events).toHaveLength(1);
      expect(result.events[0].squareBannerUrl).toBe(
        '/public/event-banners/evt_with_banners/square.png',
      );
      expect(result.events[0].rectangleBannerUrl).toBe(
        '/public/event-banners/evt_with_banners/rectangle.png',
      );
      expect(bannerStorage.getPublicUrl).toHaveBeenCalledTimes(2);
    });

    it('should include only square banner URL when no rectangle banner exists', async () => {
      const eventWithSquareBanner = createMockEvent({
        id: 'evt_square_only',
        name: 'Event With Square Banner',
        banners: {
          square: {
            type: 'square',
            filename: 'square.png',
            originalFilename: 'banner.png',
            contentType: 'image/png',
            sizeBytes: 1000,
            width: 300,
            height: 300,
            uploadedBy: 'user_123',
            uploadedAt: new Date(),
          },
        },
      });

      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: [eventWithSquareBanner],
        total: 1,
      });
      bannerStorage.getPublicUrl.mockReturnValue(
        '/public/event-banners/evt_square_only/square.png',
      );

      const result = await service.getEventsForSelection(mockCtx, {});

      expect(result.events).toHaveLength(1);
      expect(result.events[0].squareBannerUrl).toBe(
        '/public/event-banners/evt_square_only/square.png',
      );
      expect(result.events[0].rectangleBannerUrl).toBeUndefined();
      expect(bannerStorage.getPublicUrl).toHaveBeenCalledTimes(1);
    });

    it('should return correct EventSelectItem shape', async () => {
      const mockEvent = createMockEvent({
        id: 'evt_1',
        name: 'Rock Concert',
        venue: 'Madison Square Garden',
        category: EventCategory.Concert,
        imageIds: ['img_1', 'img_2'],
      });

      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: [mockEvent],
        total: 1,
      });

      const result = await service.getEventsForSelection(mockCtx, {});

      expect(result.events).toHaveLength(1);
      const item = result.events[0];
      expect(item).toEqual({
        id: 'evt_1',
        name: 'Rock Concert',
        venue: 'Madison Square Garden',
        category: EventCategory.Concert,
      });
      expect(item).not.toHaveProperty('description');
      expect(item).not.toHaveProperty('imageIds');
      expect(item).not.toHaveProperty('status');
    });

    it('should return empty array when no events match', async () => {
      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: [],
        total: 0,
      });

      const result = await service.getEventsForSelection(mockCtx, {
        search: 'nonexistent',
      });

      expect(result.events).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should only return approved events (repository filters)', async () => {
      eventsRepository.getApprovedEventsForSelection.mockResolvedValue({
        events: [],
        total: 0,
      });

      await service.getEventsForSelection(mockCtx, {});

      expect(eventsRepository.getApprovedEventsForSelection).toHaveBeenCalled();
      expect(eventsRepository.getAllEvents).not.toHaveBeenCalled();
      expect(eventsRepository.getPendingEvents).not.toHaveBeenCalled();
    });
  });
});
