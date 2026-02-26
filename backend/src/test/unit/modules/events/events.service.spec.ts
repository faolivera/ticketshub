import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../../../../modules/events/events.service';
import { EventsRepository } from '../../../../modules/events/events.repository';
import { ImagesRepository } from '../../../../modules/images/images.repository';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { TransactionsService } from '../../../../modules/transactions/transactions.service';
import { EventStatus, EventDateStatus, EventCategory } from '../../../../modules/events/events.domain';
import { ListingStatus, SeatingType, TicketType } from '../../../../modules/tickets/tickets.domain';
import type { Event, EventDate } from '../../../../modules/events/events.domain';
import type { TicketListing } from '../../../../modules/tickets/tickets.domain';
import type { Ctx } from '../../../../common/types/context';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: jest.Mocked<EventsRepository>;
  let imagesRepository: jest.Mocked<ImagesRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let transactionsService: jest.Mocked<TransactionsService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockPendingEvent: Event = {
    id: 'evt_123',
    name: 'Test Event',
    description: 'Test description',
    category: 'Concert' as any,
    venue: 'Test Venue',
    location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
    imageIds: [],
    status: EventStatus.Pending,
    createdBy: 'user_123',
    createdAt: new Date(),
    updatedAt: new Date(),
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
      createEvent: jest.fn(),
      createEventDate: jest.fn(),
      updateEvent: jest.fn(),
      updateEventDate: jest.fn(),
      deleteEventDate: jest.fn(),
      getApprovedEvents: jest.fn(),
      getAllEvents: jest.fn(),
      getPendingEvents: jest.fn(),
      getEventsByCreator: jest.fn(),
      getDatesByEventId: jest.fn(),
      getApprovedDatesByEventId: jest.fn(),
    };

    const mockImagesRepository = {
      getByIds: jest.fn(),
    };

    const mockTicketsService = {
      activatePendingListingsForEvent: jest.fn(),
      activatePendingListingsForEventDate: jest.fn(),
      createListing: jest.fn(),
      getListingById: jest.fn(),
      listListings: jest.fn(),
      getListingsByDateId: jest.fn(),
      cancelListingsByDateId: jest.fn(),
    };

    const mockTransactionsService = {
      hasCompletedTransactionsForListings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EventsRepository, useValue: mockEventsRepository },
        { provide: ImagesRepository, useValue: mockImagesRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventsRepository = module.get(EventsRepository);
    imagesRepository = module.get(ImagesRepository);
    ticketsService = module.get(TicketsService);
    transactionsService = module.get(TransactionsService);
  });

  describe('approveEvent', () => {
    it('should approve event and activate pending listings', async () => {
      const approvedEvent = { ...mockPendingEvent, status: EventStatus.Approved };

      eventsRepository.findEventById.mockResolvedValue(mockPendingEvent);
      eventsRepository.updateEvent.mockResolvedValue(approvedEvent);
      ticketsService.activatePendingListingsForEvent.mockResolvedValue(3);

      const result = await service.approveEvent(
        mockCtx,
        'evt_123',
        'admin_123',
        true,
      );

      expect(result.status).toBe(EventStatus.Approved);
      expect(ticketsService.activatePendingListingsForEvent).toHaveBeenCalledWith(
        mockCtx,
        'evt_123',
      );
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
      expect(ticketsService.activatePendingListingsForEvent).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when event does not exist', async () => {
      eventsRepository.findEventById.mockResolvedValue(undefined);

      await expect(
        service.approveEvent(mockCtx, 'nonexistent', 'admin_123', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when event is not pending', async () => {
      const approvedEvent = { ...mockPendingEvent, status: EventStatus.Approved };
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
      const approvedDate = { ...mockPendingEventDate, status: EventDateStatus.Approved };

      eventsRepository.findEventDateById.mockResolvedValue(mockPendingEventDate);
      eventsRepository.updateEventDate.mockResolvedValue(approvedDate);
      ticketsService.activatePendingListingsForEventDate.mockResolvedValue(2);

      const result = await service.approveEventDate(
        mockCtx,
        'edt_123',
        'admin_123',
        true,
      );

      expect(result.status).toBe(EventDateStatus.Approved);
      expect(ticketsService.activatePendingListingsForEventDate).toHaveBeenCalledWith(
        mockCtx,
        'edt_123',
        'evt_123',
      );
    });

    it('should reject event date without activating listings', async () => {
      const rejectedDate = {
        ...mockPendingEventDate,
        status: EventDateStatus.Rejected,
        rejectionReason: 'Invalid date',
      };

      eventsRepository.findEventDateById.mockResolvedValue(mockPendingEventDate);
      eventsRepository.updateEventDate.mockResolvedValue(rejectedDate);

      const result = await service.approveEventDate(
        mockCtx,
        'edt_123',
        'admin_123',
        false,
        'Invalid date',
      );

      expect(result.status).toBe(EventDateStatus.Rejected);
      expect(ticketsService.activatePendingListingsForEventDate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when event date does not exist', async () => {
      eventsRepository.findEventDateById.mockResolvedValue(undefined);

      await expect(
        service.approveEventDate(mockCtx, 'nonexistent', 'admin_123', true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when event date is not pending', async () => {
      const approvedDate = { ...mockPendingEventDate, status: EventDateStatus.Approved };
      eventsRepository.findEventDateById.mockResolvedValue(approvedDate);

      await expect(
        service.approveEventDate(mockCtx, 'edt_123', 'admin_123', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when rejecting without reason', async () => {
      eventsRepository.findEventDateById.mockResolvedValue(mockPendingEventDate);

      await expect(
        service.approveEventDate(mockCtx, 'edt_123', 'admin_123', false),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adminUpdateEventWithDates', () => {
    const mockApprovedEvent: Event = {
      id: 'evt_123',
      name: 'Test Event',
      description: 'Test description for event',
      category: EventCategory.Concert,
      venue: 'Test Venue',
      location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
      imageIds: [],
      status: EventStatus.Approved,
      createdBy: 'user_123',
      approvedBy: 'admin_123',
      createdAt: new Date(),
      updatedAt: new Date(),
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
      type: TicketType.DigitalTransferable,
      seatingType: SeatingType.Unnumbered,
      ticketUnits: [{ id: 'unit_1', status: 'available' as any }],
      sellTogether: false,
      pricePerTicket: { amount: 5000, currency: 'USD' },
      status: ListingStatus.Active,
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
      eventsRepository.getDatesByEventId.mockResolvedValue([mockApprovedEventDate]);

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
      const updatedDate = { ...mockApprovedEventDate, date: new Date('2025-07-01') };
      eventsRepository.findEventById
        .mockResolvedValueOnce(mockApprovedEvent)
        .mockResolvedValueOnce(mockApprovedEvent);
      eventsRepository.findEventDateById.mockResolvedValue(mockApprovedEventDate);
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
        date: new Date('2025-08-01'),
        status: EventDateStatus.Approved,
        createdBy: 'admin_123',
        approvedBy: 'admin_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      eventsRepository.findEventById
        .mockResolvedValueOnce(mockApprovedEvent)
        .mockResolvedValueOnce(mockApprovedEvent);
      eventsRepository.createEventDate.mockResolvedValue(newDate);
      eventsRepository.getDatesByEventId.mockResolvedValue([mockApprovedEventDate, newDate]);

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
      eventsRepository.findEventDateById.mockResolvedValue(mockApprovedEventDate);
      ticketsService.getListingsByDateId.mockResolvedValue([]);
      eventsRepository.deleteEventDate.mockResolvedValue();
      eventsRepository.getDatesByEventId.mockResolvedValue([]);

      const result = await service.adminUpdateEventWithDates(
        mockCtx,
        'evt_123',
        { datesToDelete: ['edt_123'] },
        'admin_123',
      );

      expect(eventsRepository.deleteEventDate).toHaveBeenCalledWith(mockCtx, 'edt_123');
      expect(result.deletedDateIds).toContain('edt_123');
    });

    it('should throw BadRequestException when deleting date with completed transactions', async () => {
      eventsRepository.findEventById.mockResolvedValue(mockApprovedEvent);
      eventsRepository.findEventDateById.mockResolvedValue(mockApprovedEventDate);
      ticketsService.getListingsByDateId.mockResolvedValue([mockListing]);
      transactionsService.hasCompletedTransactionsForListings.mockResolvedValue(true);

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
      eventsRepository.findEventDateById.mockResolvedValue(mockApprovedEventDate);
      ticketsService.getListingsByDateId.mockResolvedValue([mockListing]);
      transactionsService.hasCompletedTransactionsForListings.mockResolvedValue(false);
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

      expect(ticketsService.cancelListingsByDateId).toHaveBeenCalledWith(mockCtx, 'edt_123');
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Cancelled 1 listing');
    });

    it('should throw BadRequestException when date belongs to different event', async () => {
      const dateFromDifferentEvent: EventDate = {
        ...mockApprovedEventDate,
        eventId: 'evt_different',
      };
      eventsRepository.findEventById.mockResolvedValue(mockApprovedEvent);
      eventsRepository.findEventDateById.mockResolvedValue(dateFromDifferentEvent);

      await expect(
        service.adminUpdateEventWithDates(
          mockCtx,
          'evt_123',
          { datesToDelete: ['edt_123'] },
          'admin_123',
        ),
      ).rejects.toThrow(BadRequestException);
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
      eventsRepository.findEventDateById.mockResolvedValue(mockApprovedEventDate);
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
});
