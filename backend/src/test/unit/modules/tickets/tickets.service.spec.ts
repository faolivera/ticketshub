import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { TicketsRepository } from '../../../../modules/tickets/tickets.repository';
import { EventsService } from '../../../../modules/events/events.service';
import {
  ListingStatus,
  TicketType,
  SeatingType,
  TicketUnitStatus,
} from '../../../../modules/tickets/tickets.domain';
import { EventStatus, EventDateStatus, EventSectionStatus } from '../../../../modules/events/events.domain';
import { UserLevel } from '../../../../modules/users/users.domain';
import type { TicketListing } from '../../../../modules/tickets/tickets.domain';
import type { CurrencyCode } from '../../../../modules/shared/money.domain';
import type { Ctx } from '../../../../common/types/context';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketsRepository: jest.Mocked<TicketsRepository>;
  let eventsService: jest.Mocked<EventsService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockApprovedEvent = {
    id: 'evt_123',
    name: 'Test Event',
    status: EventStatus.Approved,
    venue: 'Test Venue',
    dates: [
      {
        id: 'edt_123',
        eventId: 'evt_123',
        date: new Date(),
        status: EventDateStatus.Approved,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user_123',
      },
      {
        id: 'edt_456',
        eventId: 'evt_123',
        date: new Date(),
        status: EventDateStatus.Pending,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user_123',
      },
    ],
    sections: [
      {
        id: 'sec_test_123',
        eventId: 'evt_123',
        name: 'General',
        status: EventSectionStatus.Approved,
        createdBy: 'user_123',
        approvedBy: 'admin_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    images: [],
    category: 'Concert',
    description: 'Test description',
    location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
    imageIds: [],
    createdBy: 'user_123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPendingEvent = {
    ...mockApprovedEvent,
    id: 'evt_pending',
    status: EventStatus.Pending,
    dates: [
      {
        id: 'edt_789',
        eventId: 'evt_pending',
        date: new Date(),
        status: EventDateStatus.Pending,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user_123',
      },
    ],
    sections: [
      {
        id: 'sec_test_123',
        eventId: 'evt_pending',
        name: 'General',
        status: EventSectionStatus.Approved,
        createdBy: 'user_123',
        approvedBy: 'admin_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  const mockPendingListing: TicketListing = {
    id: 'tkt_pending_1',
    sellerId: 'seller_123',
    eventId: 'evt_123',
    eventDateId: 'edt_456',
    eventSectionId: 'sec_test_123',
    type: TicketType.DigitalTransferable,
    seatingType: SeatingType.Unnumbered,
    ticketUnits: [{ id: 'unit_1', status: TicketUnitStatus.Available }],
    sellTogether: false,
    pricePerTicket: { amount: 5000, currency: 'USD' },
    status: ListingStatus.Pending,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockTicketsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      getAll: jest.fn(),
      getActiveListings: jest.fn(),
      getByEventId: jest.fn(),
      getByEventDateId: jest.fn(),
      getBySellerId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reserveUnits: jest.fn(),
      restoreUnits: jest.fn(),
      getPendingByEventId: jest.fn(),
      getPendingByEventDateId: jest.fn(),
      bulkUpdateStatus: jest.fn(),
    };

    const mockEventsService = {
      getEventById: jest.fn(),
      createEvent: jest.fn(),
      addEventDate: jest.fn(),
      approveEvent: jest.fn(),
      approveEventDate: jest.fn(),
      listEvents: jest.fn(),
      getPendingEvents: jest.fn(),
      getMyEvents: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketsRepository, useValue: mockTicketsRepository },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    ticketsRepository = module.get(TicketsRepository);
    eventsService = module.get(EventsService);
  });

  describe('createListing', () => {
    const baseCreateRequest = {
      eventId: 'evt_123',
      eventDateId: 'edt_123',
      eventSectionId: 'sec_test_123',
      type: TicketType.DigitalTransferable,
      seatingType: SeatingType.Unnumbered,
      quantity: 2,
      pricePerTicket: { amount: 5000, currency: 'USD' as CurrencyCode },
    };

    it('should create listing with Active status when event and date are approved', async () => {
      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);
      ticketsRepository.create.mockImplementation(async (ctx, listing) => listing);

      const result = await service.createListing(
        mockCtx,
        'seller_123',
        UserLevel.Seller,
        baseCreateRequest,
      );

      expect(result.status).toBe(ListingStatus.Active);
      expect(ticketsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should create listing with Pending status when event date is pending', async () => {
      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);
      ticketsRepository.create.mockImplementation(async (ctx, listing) => listing);

      const result = await service.createListing(
        mockCtx,
        'seller_123',
        UserLevel.Seller,
        { ...baseCreateRequest, eventDateId: 'edt_456' },
      );

      expect(result.status).toBe(ListingStatus.Pending);
    });

    it('should create listing with Pending status when event is pending', async () => {
      eventsService.getEventById.mockResolvedValue(mockPendingEvent as any);
      ticketsRepository.create.mockImplementation(async (ctx, listing) => listing);

      const result = await service.createListing(
        mockCtx,
        'seller_123',
        UserLevel.Seller,
        { ...baseCreateRequest, eventId: 'evt_pending', eventDateId: 'edt_789' },
      );

      expect(result.status).toBe(ListingStatus.Pending);
    });

    it('should throw BadRequestException when event is rejected', async () => {
      const rejectedEvent = { ...mockApprovedEvent, status: EventStatus.Rejected };
      eventsService.getEventById.mockResolvedValue(rejectedEvent as any);

      await expect(
        service.createListing(mockCtx, 'seller_123', UserLevel.Seller, baseCreateRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when event date is rejected', async () => {
      const eventWithRejectedDate = {
        ...mockApprovedEvent,
        dates: [
          {
            ...mockApprovedEvent.dates[0],
            status: EventDateStatus.Rejected,
          },
        ],
      };
      eventsService.getEventById.mockResolvedValue(eventWithRejectedDate as any);

      await expect(
        service.createListing(mockCtx, 'seller_123', UserLevel.Seller, baseCreateRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when event does not exist', async () => {
      eventsService.getEventById.mockRejectedValue(new NotFoundException('Event not found'));

      await expect(
        service.createListing(mockCtx, 'seller_123', UserLevel.Seller, baseCreateRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('activatePendingListingsForEvent', () => {
    it('should activate pending listings for approved event with approved dates', async () => {
      const pendingListings: TicketListing[] = [
        { ...mockPendingListing, id: 'tkt_1', eventDateId: 'edt_123' },
        { ...mockPendingListing, id: 'tkt_2', eventDateId: 'edt_456' },
      ];

      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);
      ticketsRepository.getPendingByEventId.mockResolvedValue(pendingListings);
      ticketsRepository.bulkUpdateStatus.mockResolvedValue(1);

      const result = await service.activatePendingListingsForEvent(mockCtx, 'evt_123');

      expect(result).toBe(1);
      expect(ticketsRepository.bulkUpdateStatus).toHaveBeenCalledWith(
        mockCtx,
        ['tkt_1'],
        ListingStatus.Active,
      );
    });

    it('should return 0 when event is not approved', async () => {
      eventsService.getEventById.mockResolvedValue(mockPendingEvent as any);

      const result = await service.activatePendingListingsForEvent(mockCtx, 'evt_pending');

      expect(result).toBe(0);
      expect(ticketsRepository.bulkUpdateStatus).not.toHaveBeenCalled();
    });

    it('should return 0 when no pending listings exist', async () => {
      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);
      ticketsRepository.getPendingByEventId.mockResolvedValue([]);

      const result = await service.activatePendingListingsForEvent(mockCtx, 'evt_123');

      expect(result).toBe(0);
      expect(ticketsRepository.bulkUpdateStatus).not.toHaveBeenCalled();
    });
  });

  describe('getListingById', () => {
    const mockListing: TicketListing = {
      id: 'tkt_123',
      sellerId: 'seller_123',
      eventId: 'evt_123',
      eventDateId: 'edt_123',
      eventSectionId: 'sec_test_123',
      type: TicketType.DigitalTransferable,
      seatingType: SeatingType.Unnumbered,
      ticketUnits: [{ id: 'unit_1', status: TicketUnitStatus.Available }],
      sellTogether: false,
      pricePerTicket: { amount: 5000, currency: 'USD' },
      status: ListingStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return listing enriched with event info including sectionName', async () => {
      ticketsRepository.findById.mockResolvedValue(mockListing);
      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);

      const result = await service.getListingById(mockCtx, 'tkt_123');

      expect(result).toMatchObject({
        ...mockListing,
        eventName: 'Test Event',
        venue: 'Test Venue',
        sectionName: 'General',
      });
      expect(result.eventDate).toBeDefined();
    });

    it('should return sectionName as Unknown when section not found', async () => {
      const listingWithMissingSection = {
        ...mockListing,
        eventSectionId: 'non_existent_section',
      };
      ticketsRepository.findById.mockResolvedValue(listingWithMissingSection);
      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);

      const result = await service.getListingById(mockCtx, 'tkt_123');

      expect(result.sectionName).toBe('Unknown');
    });

    it('should throw NotFoundException when listing does not exist', async () => {
      ticketsRepository.findById.mockResolvedValue(null);

      await expect(service.getListingById(mockCtx, 'non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('activatePendingListingsForEventDate', () => {
    it('should activate pending listings when event and date are approved', async () => {
      const pendingListings: TicketListing[] = [
        { ...mockPendingListing, id: 'tkt_1', eventDateId: 'edt_123' },
      ];

      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);
      ticketsRepository.getPendingByEventDateId.mockResolvedValue(pendingListings);
      ticketsRepository.bulkUpdateStatus.mockResolvedValue(1);

      const result = await service.activatePendingListingsForEventDate(
        mockCtx,
        'edt_123',
        'evt_123',
      );

      expect(result).toBe(1);
      expect(ticketsRepository.bulkUpdateStatus).toHaveBeenCalledWith(
        mockCtx,
        ['tkt_1'],
        ListingStatus.Active,
      );
    });

    it('should return 0 when event is not approved', async () => {
      eventsService.getEventById.mockResolvedValue(mockPendingEvent as any);

      const result = await service.activatePendingListingsForEventDate(
        mockCtx,
        'edt_789',
        'evt_pending',
      );

      expect(result).toBe(0);
      expect(ticketsRepository.bulkUpdateStatus).not.toHaveBeenCalled();
    });

    it('should return 0 when date is not approved', async () => {
      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);

      const result = await service.activatePendingListingsForEventDate(
        mockCtx,
        'edt_456',
        'evt_123',
      );

      expect(result).toBe(0);
      expect(ticketsRepository.bulkUpdateStatus).not.toHaveBeenCalled();
    });

    it('should return 0 when no pending listings exist', async () => {
      eventsService.getEventById.mockResolvedValue(mockApprovedEvent as any);
      ticketsRepository.getPendingByEventDateId.mockResolvedValue([]);

      const result = await service.activatePendingListingsForEventDate(
        mockCtx,
        'edt_123',
        'evt_123',
      );

      expect(result).toBe(0);
      expect(ticketsRepository.bulkUpdateStatus).not.toHaveBeenCalled();
    });
  });
});
