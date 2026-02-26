import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from '../../../../modules/admin/admin.service';
import { PaymentConfirmationsService } from '../../../../modules/payment-confirmations/payment-confirmations.service';
import { TransactionsService } from '../../../../modules/transactions/transactions.service';
import { EventsService } from '../../../../modules/events/events.service';
import { TicketsRepository } from '../../../../modules/tickets/tickets.repository';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { UsersService } from '../../../../modules/users/users.service';
import { PaymentConfirmationStatus } from '../../../../modules/payment-confirmations/payment-confirmations.domain';
import { TransactionStatus } from '../../../../modules/transactions/transactions.domain';
import { TicketType } from '../../../../modules/tickets/tickets.domain';
import {
  EventStatus,
  EventDateStatus,
  EventSectionStatus,
  EventCategory,
} from '../../../../modules/events/events.domain';
import { SeatingType } from '../../../../modules/tickets/tickets.domain';
import type { Ctx } from '../../../../common/types/context';
import type { Transaction } from '../../../../modules/transactions/transactions.domain';
import type { PaymentConfirmationWithTransaction } from '../../../../modules/payment-confirmations/payment-confirmations.api';
import type { AdminUpdateEventResponse } from '../../../../modules/admin/admin.api';
import type { Event } from '../../../../modules/events/events.domain';
import type { User } from '../../../../modules/users/users.domain';
import { Role, UserLevel, UserStatus } from '../../../../modules/users/users.domain';

describe('AdminService', () => {
  let service: AdminService;
  let paymentConfirmationsService: jest.Mocked<PaymentConfirmationsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let eventsService: jest.Mocked<EventsService>;
  let ticketsRepository: jest.Mocked<TicketsRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let usersService: jest.Mocked<UsersService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockTransaction: Transaction = {
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketType: TicketType.DigitalTransferable,
    ticketUnitIds: ['unit_1', 'unit_2'],
    quantity: 2,
    ticketPrice: { amount: 20000, currency: 'USD' },
    buyerFee: { amount: 2000, currency: 'USD' },
    sellerFee: { amount: 1000, currency: 'USD' },
    totalPaid: { amount: 22000, currency: 'USD' },
    sellerReceives: { amount: 19000, currency: 'USD' },
    status: TransactionStatus.PendingPayment,
    paymentMethodId: 'bank_transfer',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConfirmationWithTransaction: PaymentConfirmationWithTransaction = {
    id: 'pc_123',
    transactionId: 'txn_123',
    uploadedBy: 'buyer_123',
    storageKey: 'txn_123_file.png',
    originalFilename: 'receipt.png',
    contentType: 'image/png',
    sizeBytes: 1024,
    status: PaymentConfirmationStatus.Pending,
    createdAt: new Date(),
    buyerName: 'John Buyer',
    sellerName: 'Jane Seller',
    eventName: 'Test Event',
    transactionAmount: 22000,
    transactionCurrency: 'USD',
  };

  beforeEach(async () => {
    const mockPaymentConfirmationsService = {
      listPendingConfirmations: jest.fn(),
      findByTransactionIds: jest.fn(),
      getPendingCount: jest.fn(),
      getPendingTransactionIds: jest.fn(),
    };

    const mockTransactionsService = {
      findById: jest.fn(),
      getPaginated: jest.fn(),
      countByStatuses: jest.fn(),
      getIdsByStatuses: jest.fn(),
    };

    const mockEventsService = {
      getPendingEvents: jest.fn().mockResolvedValue([]),
      adminUpdateEventWithDates: jest.fn(),
      getAllEventsPaginated: jest.fn(),
      getEventById: jest.fn(),
    };

    const mockTicketsRepository = {
      getAll: jest.fn().mockResolvedValue([]),
      getAllByEventId: jest.fn().mockResolvedValue([]),
    };

    const mockTicketsService = {
      getListingStatsByEventIds: jest.fn(),
      getListingsByIds: jest.fn(),
      getListingById: jest.fn(),
    };

    const mockUsersService = {
      findByIds: jest.fn(),
      findByEmailContaining: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PaymentConfirmationsService,
          useValue: mockPaymentConfirmationsService,
        },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: TicketsRepository, useValue: mockTicketsRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    paymentConfirmationsService = module.get(PaymentConfirmationsService);
    transactionsService = module.get(TransactionsService);
    eventsService = module.get(EventsService);
    ticketsRepository = module.get(TicketsRepository);
    ticketsService = module.get(TicketsService);
    usersService = module.get(UsersService);
  });

  describe('getAdminPayments', () => {
    it('should return enriched payment confirmations', async () => {
      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [mockConfirmationWithTransaction],
        total: 1,
      });
      transactionsService.findById.mockResolvedValue(mockTransaction);

      const result = await service.getAdminPayments(mockCtx);

      expect(result.payments).toHaveLength(1);
      expect(result.total).toBe(1);

      const payment = result.payments[0];
      expect(payment.id).toBe('pc_123');
      expect(payment.transactionId).toBe('txn_123');
      expect(payment.listingId).toBe('listing_123');
      expect(payment.quantity).toBe(2);
      expect(payment.pricePerUnit).toEqual({ amount: 10000, currency: 'USD' });
      expect(payment.sellerFee).toEqual({ amount: 1000, currency: 'USD' });
      expect(payment.buyerFee).toEqual({ amount: 2000, currency: 'USD' });
    });

    it('should calculate pricePerUnit correctly', async () => {
      const transactionWith3Tickets: Transaction = {
        ...mockTransaction,
        quantity: 3,
        ticketPrice: { amount: 30000, currency: 'USD' },
      };

      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [mockConfirmationWithTransaction],
        total: 1,
      });
      transactionsService.findById.mockResolvedValue(transactionWith3Tickets);

      const result = await service.getAdminPayments(mockCtx);

      expect(result.payments[0].pricePerUnit).toEqual({
        amount: 10000,
        currency: 'USD',
      });
    });

    it('should return empty array when no pending confirmations', async () => {
      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [],
        total: 0,
      });

      const result = await service.getAdminPayments(mockCtx);

      expect(result.payments).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should skip confirmations where transaction is not found', async () => {
      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [mockConfirmationWithTransaction],
        total: 1,
      });
      transactionsService.findById.mockResolvedValue(null);

      const result = await service.getAdminPayments(mockCtx);

      expect(result.payments).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should preserve existing transaction enrichment data', async () => {
      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [mockConfirmationWithTransaction],
        total: 1,
      });
      transactionsService.findById.mockResolvedValue(mockTransaction);

      const result = await service.getAdminPayments(mockCtx);

      const payment = result.payments[0];
      expect(payment.buyerName).toBe('John Buyer');
      expect(payment.sellerName).toBe('Jane Seller');
      expect(payment.eventName).toBe('Test Event');
      expect(payment.transactionAmount).toBe(22000);
      expect(payment.transactionCurrency).toBe('USD');
    });

    it('should handle multiple confirmations', async () => {
      const secondConfirmation: PaymentConfirmationWithTransaction = {
        ...mockConfirmationWithTransaction,
        id: 'pc_456',
        transactionId: 'txn_456',
      };

      const secondTransaction: Transaction = {
        ...mockTransaction,
        id: 'txn_456',
        listingId: 'listing_456',
        quantity: 1,
        ticketPrice: { amount: 5000, currency: 'USD' },
      };

      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [mockConfirmationWithTransaction, secondConfirmation],
        total: 2,
      });
      transactionsService.findById
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce(secondTransaction);

      const result = await service.getAdminPayments(mockCtx);

      expect(result.payments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.payments[0].id).toBe('pc_123');
      expect(result.payments[1].id).toBe('pc_456');
    });

    it('should include optional fields when present', async () => {
      const confirmationWithOptionals: PaymentConfirmationWithTransaction = {
        ...mockConfirmationWithTransaction,
        reviewedAt: new Date(),
        adminNotes: 'Test notes',
      };

      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [confirmationWithOptionals],
        total: 1,
      });
      transactionsService.findById.mockResolvedValue(mockTransaction);

      const result = await service.getAdminPayments(mockCtx);

      const payment = result.payments[0];
      expect(payment.reviewedAt).toBeDefined();
      expect(payment.adminNotes).toBe('Test notes');
    });
  });

  describe('getPendingEvents', () => {
    const mockEventWithPendingSection = {
      id: 'evt_123',
      name: 'Test Event',
      venue: 'Test Venue',
      category: EventCategory.Concert,
      status: EventStatus.Pending,
      createdAt: new Date(),
      dates: [
        {
          id: 'edt_123',
          eventId: 'evt_123',
          date: new Date('2025-06-01'),
          status: EventDateStatus.Approved,
          createdBy: 'user_123',
          approvedBy: 'admin_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      sections: [
        {
          id: 'sec_123',
          eventId: 'evt_123',
          name: 'VIP Section',
          seatingType: SeatingType.Numbered,
          status: EventSectionStatus.Pending,
          createdBy: 'user_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    it('should include seatingType in pending sections', async () => {
      eventsService.getPendingEvents.mockResolvedValue([
        mockEventWithPendingSection as any,
      ]);

      const result = await service.getPendingEvents(mockCtx);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].pendingSections).toHaveLength(1);
      expect(result.events[0].pendingSections[0].seatingType).toBe('numbered');
      expect(result.events[0].pendingSections[0].name).toBe('VIP Section');
    });

    it('should map unnumbered seating type correctly', async () => {
      const eventWithUnnumbered = {
        ...mockEventWithPendingSection,
        sections: [
          {
            ...mockEventWithPendingSection.sections[0],
            seatingType: SeatingType.Unnumbered,
          },
        ],
      };
      eventsService.getPendingEvents.mockResolvedValue([
        eventWithUnnumbered as any,
      ]);

      const result = await service.getPendingEvents(mockCtx);

      expect(result.events[0].pendingSections[0].seatingType).toBe(
        'unnumbered',
      );
    });
  });

  describe('updateEventWithDates', () => {
    const mockUpdateResponse: AdminUpdateEventResponse = {
      event: {
        id: 'evt_123',
        name: 'Updated Event',
        description: 'Updated description',
        category: 'Concert',
        venue: 'Updated Venue',
        location: {
          line1: '123 Main St',
          city: 'Test City',
          countryCode: 'US',
        },
        imageIds: [],
        status: EventStatus.Approved,
        createdBy: 'user_123',
        approvedBy: 'admin_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      dates: [
        {
          id: 'edt_123',
          eventId: 'evt_123',
          date: new Date(),
          status: EventDateStatus.Approved,
          createdBy: 'admin_123',
          approvedBy: 'admin_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      deletedDateIds: [],
    };

    it('should delegate to eventsService.adminUpdateEventWithDates', async () => {
      eventsService.adminUpdateEventWithDates.mockResolvedValue(
        mockUpdateResponse,
      );

      const result = await service.updateEventWithDates(
        mockCtx,
        'evt_123',
        { name: 'Updated Event' },
        'admin_123',
      );

      expect(eventsService.adminUpdateEventWithDates).toHaveBeenCalledWith(
        mockCtx,
        'evt_123',
        { name: 'Updated Event' },
        'admin_123',
      );
      expect(result).toEqual(mockUpdateResponse);
    });

    it('should return response with deleted date IDs when dates are deleted', async () => {
      const responseWithDeletes: AdminUpdateEventResponse = {
        ...mockUpdateResponse,
        deletedDateIds: ['edt_456', 'edt_789'],
        warnings: ['Cancelled 2 listing(s) for deleted date edt_456'],
      };
      eventsService.adminUpdateEventWithDates.mockResolvedValue(
        responseWithDeletes,
      );

      const result = await service.updateEventWithDates(
        mockCtx,
        'evt_123',
        { datesToDelete: ['edt_456', 'edt_789'] },
        'admin_123',
      );

      expect(result.deletedDateIds).toEqual(['edt_456', 'edt_789']);
      expect(result.warnings).toContain(
        'Cancelled 2 listing(s) for deleted date edt_456',
      );
    });

    it('should handle update with new dates', async () => {
      const responseWithNewDate: AdminUpdateEventResponse = {
        ...mockUpdateResponse,
        dates: [
          ...mockUpdateResponse.dates,
          {
            id: 'edt_new',
            eventId: 'evt_123',
            date: new Date('2025-06-01'),
            status: EventDateStatus.Approved,
            createdBy: 'admin_123',
            approvedBy: 'admin_123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      eventsService.adminUpdateEventWithDates.mockResolvedValue(
        responseWithNewDate,
      );

      const result = await service.updateEventWithDates(
        mockCtx,
        'evt_123',
        {
          dates: [{ date: '2025-06-01T19:00:00Z', status: 'approved' }],
        },
        'admin_123',
      );

      expect(result.dates).toHaveLength(2);
    });
  });

  describe('getAllEvents', () => {
    const mockEvent: Event = {
      id: 'evt_123',
      name: 'Test Concert',
      description: 'A test concert',
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
    };

    const mockUser: User = {
      id: 'user_123',
      email: 'user@test.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      publicName: 'Test User',
      role: Role.User,
      level: UserLevel.Seller,
      status: UserStatus.Enabled,
      imageId: 'img_123',
      country: 'US',
      currency: 'USD',
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return paginated events with creator info and listing stats', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [mockEvent],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([mockUser]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(
        new Map([
          ['evt_123', { listingsCount: 5, availableTicketsCount: 20 }],
        ]),
      );

      const result = await service.getAllEvents(mockCtx, { page: 1, limit: 20 });

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);

      const event = result.events[0];
      expect(event.id).toBe('evt_123');
      expect(event.name).toBe('Test Concert');
      expect(event.createdBy.id).toBe('user_123');
      expect(event.createdBy.publicName).toBe('Test User');
      expect(event.listingsCount).toBe(5);
      expect(event.availableTicketsCount).toBe(20);
    });

    it('should use default pagination values when not provided', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [],
        total: 0,
      });

      await service.getAllEvents(mockCtx, {});

      expect(eventsService.getAllEventsPaginated).toHaveBeenCalledWith(
        mockCtx,
        { page: 1, limit: 20, search: undefined },
      );
    });

    it('should pass search filter to events service', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [],
        total: 0,
      });

      await service.getAllEvents(mockCtx, { search: 'concert' });

      expect(eventsService.getAllEventsPaginated).toHaveBeenCalledWith(
        mockCtx,
        { page: 1, limit: 20, search: 'concert' },
      );
    });

    it('should return empty result when no events found', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [],
        total: 0,
      });

      const result = await service.getAllEvents(mockCtx, { page: 1, limit: 20 });

      expect(result.events).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate total pages correctly', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [mockEvent],
        total: 45,
      });
      usersService.findByIds.mockResolvedValue([mockUser]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(new Map());

      const result = await service.getAllEvents(mockCtx, { page: 1, limit: 20 });

      expect(result.totalPages).toBe(3);
    });

    it('should handle unknown users gracefully', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [mockEvent],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(new Map());

      const result = await service.getAllEvents(mockCtx, { page: 1, limit: 20 });

      expect(result.events[0].createdBy.publicName).toBe('Unknown User');
    });

    it('should handle events without listing stats', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [mockEvent],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([mockUser]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(new Map());

      const result = await service.getAllEvents(mockCtx, { page: 1, limit: 20 });

      expect(result.events[0].listingsCount).toBe(0);
      expect(result.events[0].availableTicketsCount).toBe(0);
    });

    it('should handle multiple events with different creators', async () => {
      const secondEvent: Event = {
        ...mockEvent,
        id: 'evt_456',
        name: 'Second Event',
        createdBy: 'user_456',
      };
      const secondUser: User = {
        ...mockUser,
        id: 'user_456',
        publicName: 'Another User',
      };

      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [mockEvent, secondEvent],
        total: 2,
      });
      usersService.findByIds.mockResolvedValue([mockUser, secondUser]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(
        new Map([
          ['evt_123', { listingsCount: 5, availableTicketsCount: 20 }],
          ['evt_456', { listingsCount: 3, availableTicketsCount: 10 }],
        ]),
      );

      const result = await service.getAllEvents(mockCtx, { page: 1, limit: 20 });

      expect(result.events).toHaveLength(2);
      expect(result.events[0].createdBy.publicName).toBe('Test User');
      expect(result.events[1].createdBy.publicName).toBe('Another User');
    });
  });

  describe('getEventListings', () => {
    const mockEventWithDates = {
      id: 'evt_123',
      name: 'Test Concert',
      description: 'A test concert',
      category: EventCategory.Concert,
      venue: 'Test Venue',
      location: {
        line1: '123 Main St',
        city: 'Test City',
        countryCode: 'US',
      },
      imageIds: [],
      images: [],
      status: EventStatus.Approved,
      createdBy: 'user_123',
      createdAt: new Date(),
      updatedAt: new Date(),
      dates: [
        {
          id: 'edt_123',
          eventId: 'evt_123',
          date: new Date('2025-06-01'),
          status: EventDateStatus.Approved,
          createdBy: 'user_123',
          approvedBy: 'admin_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      sections: [
        {
          id: 'sec_123',
          eventId: 'evt_123',
          name: 'VIP Section',
          seatingType: SeatingType.Numbered,
          status: EventSectionStatus.Approved,
          createdBy: 'user_123',
          approvedBy: 'admin_123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };

    const mockListing = {
      id: 'listing_123',
      sellerId: 'seller_123',
      eventId: 'evt_123',
      eventDateId: 'edt_123',
      eventSectionId: 'sec_123',
      type: TicketType.DigitalTransferable,
      ticketUnits: [
        { id: 'unit_1', status: 'available' },
        { id: 'unit_2', status: 'reserved' },
        { id: 'unit_3', status: 'sold' },
      ],
      sellTogether: false,
      pricePerTicket: { amount: 5000, currency: 'USD' },
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSeller: User = {
      id: 'seller_123',
      email: 'seller@test.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'Seller',
      publicName: 'Test Seller',
      role: Role.User,
      level: UserLevel.Seller,
      status: UserStatus.Enabled,
      imageId: 'img_123',
      country: 'US',
      currency: 'USD',
      emailVerified: true,
      phoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return enriched listings with seller, date, and section info', async () => {
      ticketsRepository.getAllByEventId.mockResolvedValue([mockListing as any]);
      usersService.findByIds.mockResolvedValue([mockSeller]);
      eventsService.getEventById.mockResolvedValue(mockEventWithDates as any);

      const result = await service.getEventListings(mockCtx, 'evt_123');

      expect(result.listings).toHaveLength(1);
      expect(result.total).toBe(1);

      const listing = result.listings[0];
      expect(listing.id).toBe('listing_123');
      expect(listing.createdBy.id).toBe('seller_123');
      expect(listing.createdBy.publicName).toBe('Test Seller');
      expect(listing.eventDate.id).toBe('edt_123');
      expect(listing.eventSection.id).toBe('sec_123');
      expect(listing.eventSection.name).toBe('VIP Section');
      expect(listing.totalTickets).toBe(3);
      expect(listing.ticketsByStatus).toEqual({
        available: 1,
        reserved: 1,
        sold: 1,
      });
      expect(listing.status).toBe('Active');
      expect(listing.pricePerTicket).toEqual({ amount: 5000, currency: 'USD' });
    });

    it('should return empty response when event has no listings', async () => {
      ticketsRepository.getAllByEventId.mockResolvedValue([]);

      const result = await service.getEventListings(mockCtx, 'evt_123');

      expect(result.listings).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(usersService.findByIds).not.toHaveBeenCalled();
      expect(eventsService.getEventById).not.toHaveBeenCalled();
    });

    it('should aggregate user info correctly for multiple listings', async () => {
      const secondListing = {
        ...mockListing,
        id: 'listing_456',
        sellerId: 'seller_456',
      };
      const secondSeller: User = {
        ...mockSeller,
        id: 'seller_456',
        publicName: 'Another Seller',
      };

      ticketsRepository.getAllByEventId.mockResolvedValue([
        mockListing as any,
        secondListing as any,
      ]);
      usersService.findByIds.mockResolvedValue([mockSeller, secondSeller]);
      eventsService.getEventById.mockResolvedValue(mockEventWithDates as any);

      const result = await service.getEventListings(mockCtx, 'evt_123');

      expect(result.listings).toHaveLength(2);
      expect(result.listings[0].createdBy.publicName).toBe('Test Seller');
      expect(result.listings[1].createdBy.publicName).toBe('Another Seller');

      expect(usersService.findByIds).toHaveBeenCalledTimes(1);
      expect(usersService.findByIds).toHaveBeenCalledWith(mockCtx, [
        'seller_123',
        'seller_456',
      ]);
    });

    it('should handle unknown seller gracefully', async () => {
      ticketsRepository.getAllByEventId.mockResolvedValue([mockListing as any]);
      usersService.findByIds.mockResolvedValue([]);
      eventsService.getEventById.mockResolvedValue(mockEventWithDates as any);

      const result = await service.getEventListings(mockCtx, 'evt_123');

      expect(result.listings[0].createdBy.publicName).toBe('Unknown User');
    });

    it('should count ticket statuses correctly', async () => {
      const listingWithAllAvailable = {
        ...mockListing,
        ticketUnits: [
          { id: 'unit_1', status: 'available' },
          { id: 'unit_2', status: 'available' },
          { id: 'unit_3', status: 'available' },
        ],
      };

      ticketsRepository.getAllByEventId.mockResolvedValue([
        listingWithAllAvailable as any,
      ]);
      usersService.findByIds.mockResolvedValue([mockSeller]);
      eventsService.getEventById.mockResolvedValue(mockEventWithDates as any);

      const result = await service.getEventListings(mockCtx, 'evt_123');

      expect(result.listings[0].ticketsByStatus).toEqual({
        available: 3,
        reserved: 0,
        sold: 0,
      });
    });

    it('should handle multiple listings from same seller', async () => {
      const secondListing = {
        ...mockListing,
        id: 'listing_456',
      };

      ticketsRepository.getAllByEventId.mockResolvedValue([
        mockListing as any,
        secondListing as any,
      ]);
      usersService.findByIds.mockResolvedValue([mockSeller]);
      eventsService.getEventById.mockResolvedValue(mockEventWithDates as any);

      const result = await service.getEventListings(mockCtx, 'evt_123');

      expect(result.listings).toHaveLength(2);
      expect(usersService.findByIds).toHaveBeenCalledWith(mockCtx, [
        'seller_123',
      ]);
    });
  });

  describe('getTransactionsList', () => {
    const mockListingWithEvent = {
      id: 'listing_123',
      eventName: 'Test Concert',
      eventDate: new Date('2025-06-01'),
      sectionName: 'VIP Section',
      pricePerTicket: { amount: 5000, currency: 'USD' },
    };

    it('should return paginated transactions with enriched data', async () => {
      transactionsService.getPaginated.mockResolvedValue({
        transactions: [mockTransaction],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([
        { id: 'buyer_123', publicName: 'John Buyer', email: 'buyer@test.com' } as User,
        { id: 'seller_123', publicName: 'Jane Seller', email: 'seller@test.com' } as User,
      ]);
      ticketsService.getListingsByIds.mockResolvedValue([mockListingWithEvent as any]);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionsList(mockCtx, {
        page: 1,
        limit: 20,
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.transactions[0].id).toBe('txn_123');
      expect(result.transactions[0].seller.name).toBe('Jane Seller');
      expect(result.transactions[0].buyer.name).toBe('John Buyer');
      expect(result.transactions[0].listing.eventName).toBe('Test Concert');
    });

    it('should use default pagination and resolve search by transaction id', async () => {
      usersService.findByEmailContaining.mockResolvedValue([]);
      transactionsService.getPaginated.mockResolvedValue({
        transactions: [mockTransaction],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([
        { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        { id: 'seller_123', publicName: 'Jane', email: 'jane@test.com' } as User,
      ]);
      ticketsService.getListingsByIds.mockResolvedValue([mockListingWithEvent as any]);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionsList(mockCtx, {
        search: 'txn_123',
      });

      expect(transactionsService.getPaginated).toHaveBeenCalledWith(
        mockCtx,
        1,
        20,
        { transactionIds: ['txn_123'] },
      );
      expect(result.transactions).toHaveLength(1);
    });

    it('should return empty result when no transactions', async () => {
      transactionsService.getPaginated.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const result = await service.getTransactionsList(mockCtx, {
        page: 1,
        limit: 20,
      });

      expect(result.transactions).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(usersService.findByIds).not.toHaveBeenCalled();
    });

    it('should cap limit at 20', async () => {
      transactionsService.getPaginated.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      await service.getTransactionsList(mockCtx, { page: 1, limit: 100 });

      expect(transactionsService.getPaginated).toHaveBeenCalledWith(
        mockCtx,
        1,
        20,
        undefined,
      );
    });
  });

  describe('getTransactionsPendingSummary', () => {
    it('should return pending confirmations count and IDs', async () => {
      const confirmationIds = ['txn_1', 'txn_2', 'txn_3', 'txn_4', 'txn_5'];
      const pendingTxIds = ['txn_6', 'txn_7', 'txn_8'];
      paymentConfirmationsService.getPendingTransactionIds.mockResolvedValue(confirmationIds);
      transactionsService.getIdsByStatuses.mockResolvedValue(pendingTxIds);

      const result = await service.getTransactionsPendingSummary(mockCtx);

      expect(result.pendingConfirmationsCount).toBe(5);
      expect(result.pendingTransactionsCount).toBe(3);
      expect(result.pendingConfirmationTransactionIds).toEqual(confirmationIds);
      expect(result.pendingTransactionIds).toEqual(pendingTxIds);
      expect(paymentConfirmationsService.getPendingTransactionIds).toHaveBeenCalledWith(
        mockCtx,
      );
      expect(transactionsService.getIdsByStatuses).toHaveBeenCalledWith(mockCtx, [
        TransactionStatus.PendingPayment,
      ]);
    });

    it('should return zero when no pending confirmations', async () => {
      paymentConfirmationsService.getPendingTransactionIds.mockResolvedValue([]);
      transactionsService.getIdsByStatuses.mockResolvedValue([]);

      const result = await service.getTransactionsPendingSummary(mockCtx);

      expect(result.pendingConfirmationsCount).toBe(0);
      expect(result.pendingTransactionsCount).toBe(0);
      expect(result.pendingConfirmationTransactionIds).toEqual([]);
      expect(result.pendingTransactionIds).toEqual([]);
    });
  });

  describe('getTransactionById', () => {
    const mockListingWithEvent = {
      id: 'listing_123',
      eventName: 'Test Concert',
      eventDate: new Date('2025-06-01'),
      sectionName: 'VIP Section',
      pricePerTicket: { amount: 5000, currency: 'USD' },
    };

    it('should return transaction detail with enriched data', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([{ id: 'seller_123', publicName: 'Jane', email: 'jane@test.com' } as User]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.id).toBe('txn_123');
      expect(result.seller.name).toBe('Jane');
      expect(result.buyer.name).toBe('John');
      expect(result.listing.eventName).toBe('Test Concert');
      expect(result.status).toBe(TransactionStatus.PendingPayment);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsService.findById.mockResolvedValue(null);

      await expect(
        service.getTransactionById(mockCtx, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include payment confirmation when present', async () => {
      const mockConfirmation = {
        id: 'pc_123',
        transactionId: 'txn_123',
        status: 'Pending',
        originalFilename: 'receipt.png',
        createdAt: new Date(),
        uploadedBy: 'buyer_123',
        contentType: 'image/png',
      };

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([{ id: 'seller_123', publicName: 'Jane', email: 'jane@test.com' } as User]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([
        mockConfirmation as any,
      ]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.paymentConfirmations).toHaveLength(1);
      expect(result.paymentConfirmations[0].id).toBe('pc_123');
      expect(result.paymentConfirmations[0].originalFilename).toBe('receipt.png');
    });

    it('should include paymentMethodId when present on transaction', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([{ id: 'seller_123', publicName: 'Jane', email: 'jane@test.com' } as User]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.paymentMethodId).toBe('bank_transfer');
    });

    it('should include full price breakdown (ticketPrice, buyerFee, sellerFee, totalPaid, sellerReceives)', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([{ id: 'seller_123', publicName: 'Jane', email: 'jane@test.com' } as User]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.ticketPrice).toEqual({ amount: 20000, currency: 'USD' });
      expect(result.buyerFee).toEqual({ amount: 2000, currency: 'USD' });
      expect(result.sellerFee).toEqual({ amount: 1000, currency: 'USD' });
      expect(result.totalPaid).toEqual({ amount: 22000, currency: 'USD' });
      expect(result.sellerReceives).toEqual({ amount: 19000, currency: 'USD' });
    });

    it('should include timeline dates when present on transaction', async () => {
      const cancelledAt = new Date('2025-06-15');
      const refundedAt = new Date('2025-06-16');
      const paymentApprovedAt = new Date('2025-06-10');
      const txnWithTimeline: Transaction = {
        ...mockTransaction,
        cancelledAt,
        refundedAt,
        paymentApprovedAt,
        paymentApprovedBy: 'admin_456',
        disputeId: 'dispute_789',
      };

      transactionsService.findById.mockResolvedValue(txnWithTimeline);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([{ id: 'seller_123', publicName: 'Jane', email: 'jane@test.com' } as User]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.createdAt).toEqual(mockTransaction.createdAt);
      expect(result.cancelledAt).toEqual(cancelledAt);
      expect(result.refundedAt).toEqual(refundedAt);
      expect(result.paymentApprovedAt).toEqual(paymentApprovedAt);
      expect(result.paymentApprovedBy).toBe('admin_456');
      expect(result.disputeId).toBe('dispute_789');
    });

    it('should omit optional timeline fields when absent', async () => {
      const txnMinimal: Transaction = {
        ...mockTransaction,
        paymentMethodId: undefined,
        cancelledAt: undefined,
        refundedAt: undefined,
        paymentApprovedAt: undefined,
        paymentApprovedBy: undefined,
        disputeId: undefined,
      };

      transactionsService.findById.mockResolvedValue(txnMinimal);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([{ id: 'seller_123', publicName: 'Jane', email: 'jane@test.com' } as User]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.paymentMethodId).toBeUndefined();
      expect(result.cancelledAt).toBeUndefined();
      expect(result.refundedAt).toBeUndefined();
      expect(result.paymentApprovedAt).toBeUndefined();
      expect(result.paymentApprovedBy).toBeUndefined();
      expect(result.disputeId).toBeUndefined();
    });

    it('should include bankTransferDestination when seller has bankAccount', async () => {
      const sellerWithBankAccount: User = {
        id: 'seller_123',
        email: 'jane@test.com',
        password: 'hashed',
        firstName: 'Jane',
        lastName: 'Seller',
        publicName: 'Jane',
        role: Role.User,
        level: UserLevel.Seller,
        status: UserStatus.Enabled,
        imageId: '',
        country: 'ES',
        currency: 'EUR',
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bankAccount: {
          holderName: 'Jane Seller',
          iban: 'ES9121000418450200051332',
          bic: 'CAIXESBBXXX',
          verified: true,
        },
      };

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([sellerWithBankAccount]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.bankTransferDestination).toBeDefined();
      expect(result.bankTransferDestination).toEqual({
        holderName: 'Jane Seller',
        iban: 'ES9121000418450200051332',
        bic: 'CAIXESBBXXX',
      });
    });

    it('should omit bankTransferDestination when seller has no bankAccount', async () => {
      const sellerWithoutBankAccount: User = {
        id: 'seller_123',
        email: 'jane@test.com',
        password: 'hashed',
        firstName: 'Jane',
        lastName: 'Seller',
        publicName: 'Jane',
        role: Role.User,
        level: UserLevel.Seller,
        status: UserStatus.Enabled,
        imageId: '',
        country: 'ES',
        currency: 'EUR',
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([sellerWithoutBankAccount]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.bankTransferDestination).toBeUndefined();
    });

    it('should include bankTransferDestination without bic when seller bankAccount has no bic', async () => {
      const sellerWithBankAccountNoBic: User = {
        id: 'seller_123',
        email: 'jane@test.com',
        password: 'hashed',
        firstName: 'Jane',
        lastName: 'Seller',
        publicName: 'Jane',
        role: Role.User,
        level: UserLevel.Seller,
        status: UserStatus.Enabled,
        imageId: '',
        country: 'ES',
        currency: 'EUR',
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bankAccount: {
          holderName: 'Jane Seller',
          iban: 'ES9121000418450200051332',
          verified: true,
        },
      };

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([{ id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User])
        .mockResolvedValueOnce([sellerWithBankAccountNoBic]);
      ticketsService.getListingById.mockResolvedValue(mockListingWithEvent as any);
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.bankTransferDestination).toEqual({
        holderName: 'Jane Seller',
        iban: 'ES9121000418450200051332',
        bic: undefined,
      });
    });
  });
});
