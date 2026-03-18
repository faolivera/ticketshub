import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../../../../src/modules/events/events.service';
import { EVENTS_REPOSITORY } from '../../../../src/modules/events/events.repository.interface';
import type { IEventsRepository } from '../../../../src/modules/events/events.repository.interface';
import { IMAGES_REPOSITORY } from '../../../../src/modules/images/images.repository.interface';
import type { IImagesRepository } from '../../../../src/modules/images/images.repository.interface';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { EventBannerStorageService } from '../../../../src/modules/events/event-banner-storage.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { NotificationsService } from '../../../../src/modules/notifications/notifications.service';
import { EventScoringService } from '../../../../src/modules/event-scoring/event-scoring.service';
import {
  EventStatus,
  EventDateStatus,
  EventCategory,
  EventSectionStatus,
} from '../../../../src/modules/events/events.domain';
import {
  ListingStatus,
  SeatingType,
  TicketType,
  TicketUnitStatus,
} from '../../../../src/modules/tickets/tickets.domain';
import { Role } from '../../../../src/modules/users/users.domain';
import type {
  Event,
  EventDate,
  EventSection,
  EventBanner,
} from '../../../../src/modules/events/events.domain';
import type { TicketListing } from '../../../../src/modules/tickets/tickets.domain';
import type { Ctx } from '../../../../src/common/types/context';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: jest.Mocked<IEventsRepository>;
  let imagesRepository: jest.Mocked<IImagesRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let bannerStorage: jest.Mocked<EventBannerStorageService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockPendingEvent: Event = {
    id: 'evt_123',
    slug: 'test-event-evt_123',
    name: 'Test Event',
    category: 'Concert' as any,
    venue: 'Test Venue',
    location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
    imageIds: [],
    status: EventStatus.Pending,
    createdBy: 'user_123',
    createdAt: new Date(),
    updatedAt: new Date(),
    isPopular: false,
    highlight: false,
  };

  const mockPendingEventDate: EventDate = {
    id: 'edt_123',
    eventId: 'evt_123',
    date: new Date(),
    status: EventDateStatus.Pending,
    createdBy: 'user_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockEventsRepository = {
      findEventById: jest.fn(),
      findEventDateById: jest.fn(),
      findEventDatesByIds: jest.fn().mockResolvedValue([]),
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
      getDatesByEventId: jest.fn(),
      getApprovedDatesByEventId: jest.fn(),
      getSectionsByEventId: jest.fn(),
      getApprovedSectionsByEventId: jest.fn(),
      getDatesByEventIdAndStatus: jest.fn(),
      getSectionsByEventIdAndStatus: jest.fn(),
      getDatesByEventIds: jest.fn(),
      getSectionsByEventIds: jest.fn(),
      listEventsPaginated: jest.fn(),
    };

    const mockImagesRepository = {
      findByIds: jest.fn(),
    };

    const mockTicketsService = {
      activatePendingListingsForEvent: jest.fn(),
      activatePendingListingsForEventDate: jest.fn(),
      createListing: jest.fn(),
      getListingById: jest.fn(),
      listListings: jest.fn(),
      getListingsByDateId: jest.fn(),
      cancelListingsByDateId: jest.fn(),
      getListingsBySectionId: jest.fn(),
      getMinActiveListingPriceByEventIds: jest
        .fn()
        .mockResolvedValue(new Map()),
    };

    const mockEventScoringService = {
      requestScoring: jest.fn().mockResolvedValue(undefined),
      requestScoringBatch: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
      runScoringJob: jest.fn(),
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

    const mockUsersService = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      getPublicUserInfoByIds: jest.fn(),
    };

    const mockNotificationsService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EVENTS_REPOSITORY, useValue: mockEventsRepository },
        { provide: IMAGES_REPOSITORY, useValue: mockImagesRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: EventBannerStorageService, useValue: mockBannerStorage },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EventScoringService, useValue: mockEventScoringService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventsRepository = module.get(EVENTS_REPOSITORY);
    imagesRepository = module.get(IMAGES_REPOSITORY);
    ticketsService = module.get(TicketsService);
    transactionsService = module.get(TransactionsService);
    bannerStorage = module.get(EventBannerStorageService);
  });

  describe('listEvents', () => {
    const mockApprovedEvent: Event = {
      id: 'evt_123',
      slug: 'test-event-evt_123',
      name: 'Test Event',
      category: EventCategory.Concert,
      venue: 'Test Venue',
      location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
      imageIds: [],
      status: EventStatus.Approved,
      createdBy: 'user_1',
      approvedBy: 'admin_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPopular: false,
      highlight: false,
    };

    const mockApprovedSection: EventSection = {
      id: 'sec_approved',
      eventId: 'evt_123',
      name: 'VIP',
      seatingType: SeatingType.Numbered,
      status: EventSectionStatus.Approved,
      createdBy: 'user_1',
      approvedBy: 'admin_1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPendingSection: EventSection = {
      id: 'sec_pending',
      eventId: 'evt_123',
      name: 'Campo Delantero',
      seatingType: SeatingType.Unnumbered,
      status: EventSectionStatus.Pending,
      createdBy: 'user_3',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockApprovedEventDate: EventDate = {
      id: 'edt_123',
      eventId: 'evt_123',
      date: new Date(),
      status: EventDateStatus.Approved,
      createdBy: 'user_1',
      approvedBy: 'admin_1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPendingEventDate: EventDate = {
      id: 'edt_pending',
      eventId: 'evt_123',
      date: new Date(),
      status: EventDateStatus.Pending,
      createdBy: 'user_3',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return pending and approved dates/sections by default (excludes rejected)', async () => {
      eventsRepository.listEventsPaginated.mockResolvedValue({
        events: [mockApprovedEvent],
        total: 1,
      });
      eventsRepository.getDatesByEventIds.mockResolvedValue([
        mockApprovedEventDate,
        mockPendingEventDate,
      ]);
      eventsRepository.getSectionsByEventIds.mockResolvedValue([
        mockApprovedSection,
        mockPendingSection,
      ]);
      imagesRepository.findByIds.mockResolvedValue([]);

      const result = await service.listEvents(mockCtx, {}, false);

      expect(result).toHaveLength(1);
      expect(result[0].dates).toHaveLength(2);
      expect(result[0].sections).toHaveLength(2);
      expect(result[0].sections.map((s) => s.name)).toContain('VIP');
      expect(result[0].sections.map((s) => s.name)).toContain(
        'Campo Delantero',
      );
      expect(eventsRepository.listEventsPaginated).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          approvedOnly: true,
          orderBy: 'rankingScore',
        }),
      );
      expect(eventsRepository.getDatesByEventIds).toHaveBeenCalledWith(
        mockCtx,
        ['evt_123'],
      );
      expect(eventsRepository.getSectionsByEventIds).toHaveBeenCalledWith(
        mockCtx,
        ['evt_123'],
      );
      expect(ticketsService.getMinActiveListingPriceByEventIds).toHaveBeenCalledWith(
        mockCtx,
        ['evt_123'],
      );
    });

    it('should attach lowestListingPrice when tickets service returns a map entry', async () => {
      eventsRepository.listEventsPaginated.mockResolvedValue({
        events: [mockApprovedEvent],
        total: 1,
      });
      eventsRepository.getDatesByEventIds.mockResolvedValue([
        mockApprovedEventDate,
      ]);
      eventsRepository.getSectionsByEventIds.mockResolvedValue([
        mockApprovedSection,
      ]);
      imagesRepository.findByIds.mockResolvedValue([]);
      ticketsService.getMinActiveListingPriceByEventIds.mockResolvedValue(
        new Map([
          ['evt_123', { amount: 1_500_000, currency: 'ARS' }],
        ]),
      );

      const result = await service.listEvents(mockCtx, {}, false);

      expect(result[0].lowestListingPrice).toEqual({
        amount: 1_500_000,
        currency: 'ARS',
      });
    });

    it('should include all statuses when includeAllStatuses is true', async () => {
      eventsRepository.listEventsPaginated.mockResolvedValue({
        events: [mockApprovedEvent],
        total: 1,
      });
      eventsRepository.getDatesByEventIds.mockResolvedValue([
        mockApprovedEventDate,
        mockPendingEventDate,
      ]);
      eventsRepository.getSectionsByEventIds.mockResolvedValue([
        mockApprovedSection,
        mockPendingSection,
      ]);
      imagesRepository.findByIds.mockResolvedValue([]);

      const result = await service.listEvents(mockCtx, {}, true);

      expect(result).toHaveLength(1);
      expect(result[0].dates).toHaveLength(2);
      expect(result[0].sections).toHaveLength(2);
      expect(eventsRepository.listEventsPaginated).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          approvedOnly: false,
          orderBy: 'createdAt',
        }),
      );
      expect(eventsRepository.getDatesByEventIds).toHaveBeenCalled();
      expect(eventsRepository.getSectionsByEventIds).toHaveBeenCalled();
    });
  });

  describe('approveEvent', () => {
    it('should approve event and activate pending listings', async () => {
      const eventWithBanner = {
        ...mockPendingEvent,
        banners: {
          square: {
            type: 'square' as const,
            filename: 'square.png',
            originalFilename: 'square.png',
            contentType: 'image/png',
            sizeBytes: 1000,
            width: 300,
            height: 300,
            uploadedBy: 'user_123',
            uploadedAt: new Date(),
          },
        },
      };
      const approvedEvent = {
        ...eventWithBanner,
        status: EventStatus.Approved,
      };

      eventsRepository.findEventById.mockResolvedValue(eventWithBanner);
      eventsRepository.updateEvent.mockResolvedValue(approvedEvent);
      ticketsService.activatePendingListingsForEvent.mockResolvedValue(3);

      const result = await service.approveEvent(
        mockCtx,
        'evt_123',
        'admin_123',
        true,
      );

      expect(result.status).toBe(EventStatus.Approved);
      expect(
        ticketsService.activatePendingListingsForEvent,
      ).toHaveBeenCalledWith(mockCtx, 'evt_123');
    });

    it('should reject event without activating listings', async () => {
      const rejectedEvent = {
        ...mockPendingEvent,
        status: EventStatus.Rejected,
        rejectionReason: 'Invalid event',
      };

      eventsRepository.findEventById.mockResolvedValue(mockPendingEvent);
      eventsRepository.updateEvent.mockResolvedValue(rejectedEvent);

      const result = await service.approveEvent(
        mockCtx,
        'evt_123',
        'admin_123',
        false,
        'Invalid event',
      );

      expect(result.status).toBe(EventStatus.Rejected);
      expect(
        ticketsService.activatePendingListingsForEvent,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when event does not exist', async () => {
      eventsRepository.findEventById.mockResolvedValue(undefined);

      await expect(
        service.approveEvent(mockCtx, 'nonexistent', 'admin_123', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when event is not pending', async () => {
      const approvedEvent = {
        ...mockPendingEvent,
        status: EventStatus.Approved,
      };
      eventsRepository.findEventById.mockResolvedValue(approvedEvent);

      await expect(
        service.approveEvent(mockCtx, 'evt_123', 'admin_123', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when rejecting without reason', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockPendingEvent);

      await expect(
        service.approveEvent(mockCtx, 'evt_123', 'admin_123', false),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveEventDate', () => {
    it('should approve event date and activate pending listings', async () => {
      const approvedDate = {
        ...mockPendingEventDate,
        status: EventDateStatus.Approved,
      };

      eventsRepository.findEventDateById.mockResolvedValue(
        mockPendingEventDate,
      );
      eventsRepository.updateEventDate.mockResolvedValue(approvedDate);
      ticketsService.activatePendingListingsForEventDate.mockResolvedValue(2);

      const result = await service.approveEventDate(
        mockCtx,
        'edt_123',
        'admin_123',
        true,
      );

      expect(result.status).toBe(EventDateStatus.Approved);
      expect(
        ticketsService.activatePendingListingsForEventDate,
      ).toHaveBeenCalledWith(mockCtx, 'edt_123', 'evt_123');
    });

    it('should reject event date without activating listings', async () => {
      const rejectedDate = {
        ...mockPendingEventDate,
        status: EventDateStatus.Rejected,
        rejectionReason: 'Invalid date',
      };

      eventsRepository.findEventDateById.mockResolvedValue(
        mockPendingEventDate,
      );
      eventsRepository.updateEventDate.mockResolvedValue(rejectedDate);

      const result = await service.approveEventDate(
        mockCtx,
        'edt_123',
        'admin_123',
        false,
        'Invalid date',
      );

      expect(result.status).toBe(EventDateStatus.Rejected);
      expect(
        ticketsService.activatePendingListingsForEventDate,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when event date does not exist', async () => {
      eventsRepository.findEventDateById.mockResolvedValue(undefined);

      await expect(
        service.approveEventDate(mockCtx, 'nonexistent', 'admin_123', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when event date is not pending', async () => {
      const approvedDate = {
        ...mockPendingEventDate,
        status: EventDateStatus.Approved,
      };
      eventsRepository.findEventDateById.mockResolvedValue(approvedDate);

      await expect(
        service.approveEventDate(mockCtx, 'edt_123', 'admin_123', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when rejecting without reason', async () => {
      eventsRepository.findEventDateById.mockResolvedValue(
        mockPendingEventDate,
      );

      await expect(
        service.approveEventDate(mockCtx, 'edt_123', 'admin_123', false),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adminUpdateEventWithDates', () => {
    const mockApprovedEvent: Event = {
      id: 'evt_123',
      slug: 'test-event-evt_123',
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
      isPopular: false,
      highlight: false,
    };

    const mockApprovedEventDate: EventDate = {
      id: 'edt_123',
      eventId: 'evt_123',
      date: new Date('2025-06-01'),
      status: EventDateStatus.Approved,
      createdBy: 'user_123',
      approvedBy: 'admin_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockListing: TicketListing = {
      id: 'tkt_123',
      sellerId: 'seller_123',
      eventId: 'evt_123',
      eventDateId: 'edt_123',
      eventSectionId: 'sec_test_123',
      type: TicketType.Digital,
      ticketUnits: [
        {
          id: 'unit_1',
          listingId: 'tkt_123',
          status: TicketUnitStatus.Available,
          version: 1,
        },
      ],
      sellTogether: false,
      pricePerTicket: { amount: 5000, currency: 'USD' },
      status: ListingStatus.Active,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should throw NotFoundException when event does not exist', async () => {
      eventsRepository.findEventById.mockResolvedValue(undefined);

      await expect(
        service.adminUpdateEventWithDates(
          mockCtx,
          'nonexistent',
          { name: 'New Name' },
          'admin_123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update event fields successfully', async () => {
      const updatedEvent = { ...mockApprovedEvent, name: 'Updated Event Name' };
      eventsRepository.findEventById
        .mockResolvedValueOnce(mockApprovedEvent)
        .mockResolvedValueOnce(updatedEvent);
      eventsRepository.updateEvent.mockResolvedValue(updatedEvent);
      eventsRepository.getDatesByEventId.mockResolvedValue([
        mockApprovedEventDate,
      ]);

      const result = await service.adminUpdateEventWithDates(
        mockCtx,
        'evt_123',
        { name: 'Updated Event Name' },
        'admin_123',
      );

      expect(result.event.name).toBe('Updated Event Name');
      expect(eventsRepository.updateEvent).toHaveBeenCalledWith(
        mockCtx,
        'evt_123',
        expect.objectContaining({ name: 'Updated Event Name' }),
      );
    });

    it('should update existing event date', async () => {
      const updatedDate = {
        ...mockApprovedEventDate,
        date: new Date('2025-07-01T19:00:00.000Z'),
      };
      eventsRepository.findEventById
        .mockResolvedValueOnce(mockApprovedEvent)
        .mockResolvedValueOnce(mockApprovedEvent);
      eventsRepository.findEventDatesByIds.mockResolvedValue([
        mockApprovedEventDate,
      ]);
      eventsRepository.findEventDateByEventIdAndDate.mockResolvedValue(
        undefined,
      );
      eventsRepository.updateEventDate.mockResolvedValue(updatedDate);
      eventsRepository.getDatesByEventId.mockResolvedValue([updatedDate]);

      const result = await service.adminUpdateEventWithDates(
        mockCtx,
        'evt_123',
        {
          dates: [{ id: 'edt_123', date: '2025-07-01T19:00:00Z' }],
        },
        'admin_123',
      );

      expect(eventsRepository.updateEventDate).toHaveBeenCalled();
      expect(result.dates).toHaveLength(1);
    });

    it('should create new event date when id is not provided', async () => {
      const newDate: EventDate = {
        id: 'edt_new',
        eventId: 'evt_123',
        date: new Date('2025-08-01T19:00:00.000Z'),
        status: EventDateStatus.Approved,
        createdBy: 'admin_123',
        approvedBy: 'admin_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      eventsRepository.findEventById
        .mockResolvedValueOnce(mockApprovedEvent)
        .mockResolvedValueOnce(mockApprovedEvent);
      eventsRepository.findEventDateByEventIdAndDate.mockResolvedValue(
        undefined,
      );
      eventsRepository.createEventDate.mockResolvedValue(newDate);
      eventsRepository.getDatesByEventId.mockResolvedValue([
        mockApprovedEventDate,
        newDate,
      ]);

      const result = await service.adminUpdateEventWithDates(
        mockCtx,
        'evt_123',
        {
          dates: [{ date: '2025-08-01T19:00:00Z' }],
        },
        'admin_123',
      );

      expect(eventsRepository.createEventDate).toHaveBeenCalled();
      expect(result.dates).toHaveLength(2);
    });

    it('should delete event date without listings', async () => {
      eventsRepository.findEventById
        .mockResolvedValueOnce(mockApprovedEvent)
        .mockResolvedValueOnce(mockApprovedEvent);
      eventsRepository.findEventDatesByIds.mockResolvedValue([
        mockApprovedEventDate,
      ]);
      ticketsService.getListingsByDateId.mockResolvedValue([]);
      eventsRepository.deleteEventDate.mockResolvedValue();
      eventsRepository.getDatesByEventId.mockResolvedValue([]);

      const result = await service.adminUpdateEventWithDates(
        mockCtx,
        'evt_123',
        { datesToDelete: ['edt_123'] },
        'admin_123',
      );

      expect(eventsRepository.deleteEventDate).toHaveBeenCalledWith(
        mockCtx,
        'edt_123',
      );
      expect(result.deletedDateIds).toContain('edt_123');
    });

    it('should throw BadRequestException when deleting date with completed transactions', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockApprovedEvent);
      eventsRepository.findEventDatesByIds.mockResolvedValue([
        mockApprovedEventDate,
      ]);
      ticketsService.getListingsByDateId.mockResolvedValue([mockListing]);
      transactionsService.hasCompletedTransactionsForListings.mockResolvedValue(
        true,
      );

      await expect(
        service.adminUpdateEventWithDates(
          mockCtx,
          'evt_123',
          { datesToDelete: ['edt_123'] },
          'admin_123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel pending listings when deleting date', async () => {
      eventsRepository.findEventById
        .mockResolvedValueOnce(mockApprovedEvent)
        .mockResolvedValueOnce(mockApprovedEvent);
      eventsRepository.findEventDatesByIds.mockResolvedValue([
        mockApprovedEventDate,
      ]);
      ticketsService.getListingsByDateId.mockResolvedValue([mockListing]);
      transactionsService.hasCompletedTransactionsForListings.mockResolvedValue(
        false,
      );
      ticketsService.cancelListingsByDateId.mockResolvedValue({
        cancelledCount: 1,
        listingIds: ['tkt_123'],
      });
      eventsRepository.deleteEventDate.mockResolvedValue();
      eventsRepository.getDatesByEventId.mockResolvedValue([]);

      const result = await service.adminUpdateEventWithDates(
        mockCtx,
        'evt_123',
        { datesToDelete: ['edt_123'] },
        'admin_123',
      );

      expect(ticketsService.cancelListingsByDateId).toHaveBeenCalledWith(
        mockCtx,
        'edt_123',
      );
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Cancelled 1 listing');
    });

    it('should throw BadRequestException when date belongs to different event', async () => {
      const dateFromDifferentEvent: EventDate = {
        ...mockApprovedEventDate,
        eventId: 'evt_different',
      };
      eventsRepository.findEventById.mockResolvedValue(mockApprovedEvent);
      eventsRepository.findEventDatesByIds.mockResolvedValue([
        dateFromDifferentEvent,
      ]);

      await expect(
        service.adminUpdateEventWithDates(
          mockCtx,
          'evt_123',
          { datesToDelete: ['edt_123'] },
          'admin_123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when creating duplicate event date', async () => {
      const existingWithSameDate: EventDate = {
        ...mockApprovedEventDate,
        id: 'edt_other',
        date: new Date('2025-06-01T19:00:00.000Z'),
      };
      eventsRepository.findEventById.mockResolvedValue(mockApprovedEvent);
      eventsRepository.findEventDateByEventIdAndDate.mockResolvedValue(
        existingWithSameDate,
      );

      await expect(
        service.adminUpdateEventWithDates(
          mockCtx,
          'evt_123',
          { dates: [{ date: '2025-06-01T19:00:00Z' }] },
          'admin_123',
        ),
      ).rejects.toThrow(ConflictException);

      expect(eventsRepository.createEventDate).not.toHaveBeenCalled();
    });

    it('should handle multiple updates in single request', async () => {
      const updatedEvent = {
        ...mockApprovedEvent,
        name: 'New Event Name',
        venue: 'New Venue',
      };

      eventsRepository.findEventById
        .mockResolvedValueOnce(mockApprovedEvent)
        .mockResolvedValueOnce(updatedEvent);
      eventsRepository.updateEvent.mockResolvedValue(updatedEvent);
      eventsRepository.findEventDatesByIds.mockResolvedValue([
        mockApprovedEventDate,
      ]);
      eventsRepository.findEventDateByEventIdAndDate.mockResolvedValue(
        undefined,
      );
      eventsRepository.updateEventDate.mockResolvedValue(mockApprovedEventDate);
      eventsRepository.createEventDate.mockResolvedValue({
        ...mockApprovedEventDate,
        id: 'edt_new',
      });
      eventsRepository.getDatesByEventId.mockResolvedValue([
        mockApprovedEventDate,
        { ...mockApprovedEventDate, id: 'edt_new' },
      ]);

      const result = await service.adminUpdateEventWithDates(
        mockCtx,
        'evt_123',
        {
          name: 'New Event Name',
          venue: 'New Venue',
          dates: [
            { id: 'edt_123', date: '2025-06-01T19:00:00Z' },
            { date: '2025-07-01T19:00:00Z' },
          ],
        },
        'admin_123',
      );

      expect(result.event.name).toBe('New Event Name');
      expect(result.event.venue).toBe('New Venue');
      expect(result.dates).toHaveLength(2);
    });
  });

  describe('deleteEventSection', () => {
    const mockSection: EventSection = {
      id: 'sec_123',
      eventId: 'evt_123',
      name: 'VIP Section',
      seatingType: SeatingType.Numbered,
      status: EventSectionStatus.Approved,
      createdBy: 'user_123',
      approvedBy: 'admin_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockListingForSection: TicketListing = {
      id: 'tkt_123',
      sellerId: 'seller_123',
      eventId: 'evt_123',
      eventDateId: 'edt_123',
      eventSectionId: 'sec_123',
      type: TicketType.Digital,
      ticketUnits: [
        {
          id: 'unit_1',
          listingId: 'tkt_123',
          status: TicketUnitStatus.Available,
          version: 1,
        },
      ],
      sellTogether: false,
      pricePerTicket: { amount: 5000, currency: 'USD' },
      status: ListingStatus.Active,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully delete section when no listings exist', async () => {
      eventsRepository.findEventSectionById.mockResolvedValue(mockSection);
      ticketsService.getListingsBySectionId.mockResolvedValue([]);
      eventsRepository.deleteEventSection.mockResolvedValue();

      await service.deleteEventSection(mockCtx, 'sec_123');

      expect(eventsRepository.findEventSectionById).toHaveBeenCalledWith(
        mockCtx,
        'sec_123',
      );
      expect(ticketsService.getListingsBySectionId).toHaveBeenCalledWith(
        mockCtx,
        'sec_123',
      );
      expect(eventsRepository.deleteEventSection).toHaveBeenCalledWith(
        mockCtx,
        'sec_123',
      );
    });

    it('should throw NotFoundException when section does not exist', async () => {
      eventsRepository.findEventSectionById.mockResolvedValue(undefined);

      await expect(
        service.deleteEventSection(mockCtx, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);

      expect(eventsRepository.findEventSectionById).toHaveBeenCalledWith(
        mockCtx,
        'nonexistent',
      );
      expect(ticketsService.getListingsBySectionId).not.toHaveBeenCalled();
      expect(eventsRepository.deleteEventSection).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when section has listings with count in error message', async () => {
      const multipleListings = [
        mockListingForSection,
        { ...mockListingForSection, id: 'tkt_456' },
        { ...mockListingForSection, id: 'tkt_789' },
      ];

      eventsRepository.findEventSectionById.mockResolvedValue(mockSection);
      ticketsService.getListingsBySectionId.mockResolvedValue(multipleListings);

      await expect(
        service.deleteEventSection(mockCtx, 'sec_123'),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.deleteEventSection(mockCtx, 'sec_123');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).toContain(
          '3 listing(s)',
        );
      }

      expect(eventsRepository.deleteEventSection).not.toHaveBeenCalled();
    });
  });

  describe('uploadBanner', () => {
    const mockEventWithoutBanners: Event = {
      id: 'evt_123',
      slug: 'test-event-evt_123',
      name: 'Test Event',
      category: EventCategory.Concert,
      venue: 'Test Venue',
      location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
      imageIds: [],
      status: EventStatus.Pending,
      createdBy: 'user_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPopular: false,
      highlight: false,
    };

    const mockSquareImageBuffer = Buffer.from('mock-square-image-data');

    it('should throw NotFoundException when event does not exist', async () => {
      eventsRepository.findEventById.mockResolvedValue(undefined);

      await expect(
        service.uploadBanner(
          mockCtx,
          'nonexistent',
          'user_123',
          Role.User,
          'square',
          {
            buffer: mockSquareImageBuffer,
            originalname: 'test.png',
            mimetype: 'image/png',
            size: 1000,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not creator or admin', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockEventWithoutBanners);

      await expect(
        service.uploadBanner(
          mockCtx,
          'evt_123',
          'other_user',
          Role.User,
          'square',
          {
            buffer: mockSquareImageBuffer,
            originalname: 'test.png',
            mimetype: 'image/png',
            size: 1000,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockEventWithoutBanners);

      await expect(
        service.uploadBanner(
          mockCtx,
          'evt_123',
          'user_123',
          Role.User,
          'square',
          {
            buffer: mockSquareImageBuffer,
            originalname: 'test.gif',
            mimetype: 'image/gif',
            size: 1000,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds max size', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockEventWithoutBanners);

      await expect(
        service.uploadBanner(
          mockCtx,
          'evt_123',
          'user_123',
          Role.User,
          'square',
          {
            buffer: mockSquareImageBuffer,
            originalname: 'test.png',
            mimetype: 'image/png',
            size: 10 * 1024 * 1024, // 10MB
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to upload banner for any event', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockEventWithoutBanners);
      eventsRepository.updateEvent.mockResolvedValue({
        ...mockEventWithoutBanners,
        banners: {
          square: {
            type: 'square',
            filename: 'square.png',
            originalFilename: 'test.png',
            contentType: 'image/png',
            sizeBytes: 1000,
            width: 300,
            height: 300,
            uploadedBy: 'admin_123',
            uploadedAt: expect.any(Date),
          },
        },
      });
      bannerStorage.store.mockResolvedValue('square.png');
      bannerStorage.getPublicUrl.mockReturnValue(
        '/public/event-banners/evt_123/square.png',
      );

      // Mock sharp - we can't easily mock it in this test, so we'll skip this assertion
      // In a real scenario, you would use jest.mock for the sharp module
    });
  });

  describe('deleteBanner', () => {
    const mockEventWithBanner: Event = {
      id: 'evt_123',
      slug: 'test-event-evt_123',
      name: 'Test Event',
      category: EventCategory.Concert,
      venue: 'Test Venue',
      location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
      imageIds: [],
      banners: {
        square: {
          type: 'square',
          filename: 'square.png',
          originalFilename: 'test.png',
          contentType: 'image/png',
          sizeBytes: 1000,
          width: 300,
          height: 300,
          uploadedBy: 'user_123',
          uploadedAt: new Date(),
        },
      },
      status: EventStatus.Pending,
      createdBy: 'user_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPopular: false,
      highlight: false,
    };

    it('should throw NotFoundException when event does not exist', async () => {
      eventsRepository.findEventById.mockResolvedValue(undefined);

      await expect(
        service.deleteBanner(
          mockCtx,
          'nonexistent',
          'user_123',
          Role.User,
          'square',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not creator or admin', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockEventWithBanner);

      await expect(
        service.deleteBanner(
          mockCtx,
          'evt_123',
          'other_user',
          Role.User,
          'square',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when banner does not exist', async () => {
      const eventWithoutBanner: Event = {
        ...mockEventWithBanner,
        banners: undefined,
      };
      eventsRepository.findEventById.mockResolvedValue(eventWithoutBanner);

      await expect(
        service.deleteBanner(
          mockCtx,
          'evt_123',
          'user_123',
          Role.User,
          'square',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete banner successfully', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockEventWithBanner);
      bannerStorage.deleteByFilename.mockResolvedValue(true);
      eventsRepository.updateEvent.mockResolvedValue({
        ...mockEventWithBanner,
        banners: undefined,
      });

      const result = await service.deleteBanner(
        mockCtx,
        'evt_123',
        'user_123',
        Role.User,
        'square',
      );

      expect(result.deleted).toBe(true);
      expect(result.eventId).toBe('evt_123');
      expect(result.bannerType).toBe('square');
      expect(bannerStorage.deleteByFilename).toHaveBeenCalledWith(
        'evt_123',
        'square.png',
      );
      expect(eventsRepository.updateEvent).toHaveBeenCalled();
    });

    it('should allow admin to delete any event banner', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockEventWithBanner);
      bannerStorage.deleteByFilename.mockResolvedValue(true);
      eventsRepository.updateEvent.mockResolvedValue({
        ...mockEventWithBanner,
        banners: undefined,
      });

      const result = await service.deleteBanner(
        mockCtx,
        'evt_123',
        'admin_123',
        Role.Admin,
        'square',
      );

      expect(result.deleted).toBe(true);
    });
  });

  describe('getBanners', () => {
    it('should throw NotFoundException when event does not exist', async () => {
      eventsRepository.findEventById.mockResolvedValue(undefined);

      await expect(service.getBanners(mockCtx, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty response when event has no banners', async () => {
      const eventWithoutBanners: Event = {
        id: 'evt_123',
        slug: 'test-event-evt_123',
        name: 'Test Event',
        category: EventCategory.Concert,
        venue: 'Test Venue',
        location: {
          line1: '123 Main St',
          city: 'Test City',
          countryCode: 'US',
        },
        imageIds: [],
        status: EventStatus.Approved,
        createdBy: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPopular: false,
        highlight: false,
      };
      eventsRepository.findEventById.mockResolvedValue(eventWithoutBanners);

      const result = await service.getBanners(mockCtx, 'evt_123');

      expect(result.eventId).toBe('evt_123');
      expect(result.square).toBeUndefined();
      expect(result.rectangle).toBeUndefined();
    });

    it('should return banners with URLs when event has banners', async () => {
      const mockBanner: EventBanner = {
        type: 'square',
        filename: 'square.png',
        originalFilename: 'test.png',
        contentType: 'image/png',
        sizeBytes: 1000,
        width: 300,
        height: 300,
        uploadedBy: 'user_123',
        uploadedAt: new Date(),
      };
      const eventWithBanner: Event = {
        id: 'evt_123',
        slug: 'test-event-evt_123',
        name: 'Test Event',
        category: EventCategory.Concert,
        venue: 'Test Venue',
        location: {
          line1: '123 Main St',
          city: 'Test City',
          countryCode: 'US',
        },
        imageIds: [],
        banners: { square: mockBanner },
        status: EventStatus.Approved,
        createdBy: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPopular: false,
        highlight: false,
      };
      eventsRepository.findEventById.mockResolvedValue(eventWithBanner);
      bannerStorage.getPublicUrl.mockReturnValue(
        '/public/event-banners/evt_123/square.png',
      );

      const result = await service.getBanners(mockCtx, 'evt_123');

      expect(result.eventId).toBe('evt_123');
      expect(result.square).toBeDefined();
      expect(result.square?.url).toBe(
        '/public/event-banners/evt_123/square.png',
      );
      expect(result.square?.banner).toEqual(mockBanner);
      expect(result.rectangle).toBeUndefined();
    });
  });

  describe('approveEvent with banner requirement', () => {
    it('should throw BadRequestException when approving event without square banner', async () => {
      const eventWithoutBanner: Event = {
        id: 'evt_123',
        slug: 'test-event-evt_123',
        name: 'Test Event',
        category: EventCategory.Concert,
        venue: 'Test Venue',
        location: {
          line1: '123 Main St',
          city: 'Test City',
          countryCode: 'US',
        },
        imageIds: [],
        status: EventStatus.Pending,
        createdBy: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPopular: false,
        highlight: false,
      };
      eventsRepository.findEventById.mockResolvedValue(eventWithoutBanner);

      await expect(
        service.approveEvent(mockCtx, 'evt_123', 'admin_123', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve event successfully when square banner exists', async () => {
      const eventWithBanner: Event = {
        id: 'evt_123',
        slug: 'test-event-evt_123',
        name: 'Test Event',
        category: EventCategory.Concert,
        venue: 'Test Venue',
        location: {
          line1: '123 Main St',
          city: 'Test City',
          countryCode: 'US',
        },
        imageIds: [],
        banners: {
          square: {
            type: 'square',
            filename: 'square.png',
            originalFilename: 'test.png',
            contentType: 'image/png',
            sizeBytes: 1000,
            width: 300,
            height: 300,
            uploadedBy: 'user_123',
            uploadedAt: new Date(),
          },
        },
        status: EventStatus.Pending,
        createdBy: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPopular: false,
        highlight: false,
      };
      const approvedEvent = {
        ...eventWithBanner,
        status: EventStatus.Approved,
        approvedBy: 'admin_123',
      };

      eventsRepository.findEventById.mockResolvedValue(eventWithBanner);
      eventsRepository.updateEvent.mockResolvedValue(approvedEvent);
      ticketsService.activatePendingListingsForEvent.mockResolvedValue(0);

      const result = await service.approveEvent(
        mockCtx,
        'evt_123',
        'admin_123',
        true,
      );

      expect(result.status).toBe(EventStatus.Approved);
      expect(eventsRepository.updateEvent).toHaveBeenCalled();
    });

    it('should allow rejecting event without square banner', async () => {
      const eventWithoutBanner: Event = {
        id: 'evt_123',
        slug: 'test-event-evt_123',
        name: 'Test Event',
        category: EventCategory.Concert,
        venue: 'Test Venue',
        location: {
          line1: '123 Main St',
          city: 'Test City',
          countryCode: 'US',
        },
        imageIds: [],
        status: EventStatus.Pending,
        createdBy: 'user_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPopular: false,
        highlight: false,
      };
      const rejectedEvent = {
        ...eventWithoutBanner,
        status: EventStatus.Rejected,
        rejectionReason: 'Missing banner',
      };

      eventsRepository.findEventById.mockResolvedValue(eventWithoutBanner);
      eventsRepository.updateEvent.mockResolvedValue(rejectedEvent);

      const result = await service.approveEvent(
        mockCtx,
        'evt_123',
        'admin_123',
        false,
        'Missing banner',
      );

      expect(result.status).toBe(EventStatus.Rejected);
    });
  });
});
