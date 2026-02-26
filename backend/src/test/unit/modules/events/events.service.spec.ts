import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from '../../../../modules/events/events.service';
import { EventsRepository } from '../../../../modules/events/events.repository';
import { ImagesRepository } from '../../../../modules/images/images.repository';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { EventStatus, EventDateStatus } from '../../../../modules/events/events.domain';
import type { Event, EventDate } from '../../../../modules/events/events.domain';
import type { Ctx } from '../../../../common/types/context';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: jest.Mocked<EventsRepository>;
  let imagesRepository: jest.Mocked<ImagesRepository>;
  let ticketsService: jest.Mocked<TicketsService>;

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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EventsRepository, useValue: mockEventsRepository },
        { provide: ImagesRepository, useValue: mockImagesRepository },
        { provide: TicketsService, useValue: mockTicketsService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    eventsRepository = module.get(EventsRepository);
    imagesRepository = module.get(ImagesRepository);
    ticketsService = module.get(TicketsService);
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
});
