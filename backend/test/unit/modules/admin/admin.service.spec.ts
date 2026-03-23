import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from '../../../../src/modules/admin/admin.service';
import { PRIVATE_STORAGE_PROVIDER } from '../../../../src/common/storage/file-storage-provider.interface';
import { PrismaService } from '../../../../src/common/prisma/prisma.service';
import { PaymentConfirmationsService } from '../../../../src/modules/payment-confirmations/payment-confirmations.service';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { EventsService } from '../../../../src/modules/events/events.service';
import { TICKETS_REPOSITORY } from '../../../../src/modules/tickets/tickets.repository.interface';
import type { ITicketsRepository } from '../../../../src/modules/tickets/tickets.repository.interface';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { SupportService } from '../../../../src/modules/support/support.service';
import { EventScoringService } from '../../../../src/modules/event-scoring/event-scoring.service';
import { PaymentConfirmationStatus } from '../../../../src/modules/payment-confirmations/payment-confirmations.domain';
import {
  TransactionStatus,
  RequiredActor,
} from '../../../../src/modules/transactions/transactions.domain';
import { TicketType } from '../../../../src/modules/tickets/tickets.domain';
import {
  EventStatus,
  EventDateStatus,
  EventSectionStatus,
  EventCategory,
} from '../../../../src/modules/events/events.domain';
import { SeatingType } from '../../../../src/modules/tickets/tickets.domain';
import type { Ctx } from '../../../../src/common/types/context';
import type { Transaction } from '../../../../src/modules/transactions/transactions.domain';
import type { PaymentConfirmationWithTransaction } from '../../../../src/modules/payment-confirmations/payment-confirmations.api';
import type { AdminUpdateEventResponse } from '../../../../src/modules/admin/admin.api';
import type { Event } from '../../../../src/modules/events/events.domain';
import type { User } from '../../../../src/modules/users/users.domain';
import {
  Language,
  Role,
  UserStatus,
} from '../../../../src/modules/users/users.domain';

describe('AdminService', () => {
  let service: AdminService;
  let paymentConfirmationsService: jest.Mocked<PaymentConfirmationsService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let eventsService: jest.Mocked<EventsService>;
  let ticketsRepository: jest.Mocked<ITicketsRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let usersService: jest.Mocked<UsersService>;
  let mockPrivateStorage: { store: jest.Mock; retrieve: jest.Mock };
  let mockPrisma: {
    payoutReceiptFile: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockTransaction: Transaction = {
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketType: TicketType.Digital,
    ticketUnitIds: ['unit_1', 'unit_2'],
    quantity: 2,
    ticketPrice: { amount: 20000, currency: 'USD' },
    buyerPlatformFee: { amount: 2000, currency: 'USD' },
    sellerPlatformFee: { amount: 1000, currency: 'USD' },
    paymentMethodCommission: { amount: 2400, currency: 'USD' },
    totalPaid: { amount: 24400, currency: 'USD' },
    sellerReceives: { amount: 19000, currency: 'USD' },
    pricingSnapshotId: 'ps_123',
    status: TransactionStatus.PendingPayment,
    requiredActor: RequiredActor.Buyer,
    paymentMethodId: 'bank_transfer',
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    version: 1,
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
      findByIds: jest.fn(),
      getPaginated: jest.fn(),
      countByStatuses: jest.fn(),
      getIdsByStatuses: jest.fn(),
      getTransactionAuditLogs: jest.fn(),
    };

    const mockEventsService = {
      getPendingEvents: jest.fn().mockResolvedValue([]),
      adminUpdateEventWithDates: jest.fn(),
      getAllEventsPaginated: jest.fn(),
      getDatesByEventIds: jest.fn().mockResolvedValue([]),
      getEventById: jest.fn(),
      createEvent: jest.fn(),
      addEventDate: jest.fn(),
      addEventSection: jest.fn(),
      uploadBanner: jest.fn().mockResolvedValue({}),
      getExistingImportSourceKeys: jest.fn().mockResolvedValue(new Set<string>()),
      getBannerPublicUrl: jest.fn().mockReturnValue('https://cdn.example.com/square.jpg'),
      getSquareBannerContent: jest.fn().mockResolvedValue(null),
    };

    const mockTicketsRepository = {
      getAllByEventId: jest.fn().mockResolvedValue([]),
      getPendingByEventIds: jest.fn().mockResolvedValue([]),
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

    const mockPaymentMethodsService = {
      findById: jest
        .fn()
        .mockRejectedValue(new NotFoundException('Payment method not found')),
    };

    mockPrivateStorage = {
      store: jest.fn().mockResolvedValue({
        key: 'test-key',
        location: 's3://bucket/test-key',
      }),
      retrieve: jest.fn().mockResolvedValue(Buffer.from('file-content')),
    };

    mockPrisma = {
      payoutReceiptFile: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'prf_1', transactionId: 'txn_123' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const mockSupportService = {
      getTicketByTransactionId: jest.fn(),
      createTicket: jest.fn(),
      addMessage: jest.fn(),
      getTicketsByTransactionIds: jest.fn().mockResolvedValue(new Map()),
    };

    const mockEventScoringService = {
      requestScoring: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PaymentConfirmationsService,
          useValue: mockPaymentConfirmationsService,
        },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: TICKETS_REPOSITORY, useValue: mockTicketsRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PRIVATE_STORAGE_PROVIDER, useValue: mockPrivateStorage! },
        { provide: PrismaService, useValue: mockPrisma! },
        { provide: SupportService, useValue: mockSupportService },
        { provide: EventScoringService, useValue: mockEventScoringService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    paymentConfirmationsService = module.get(PaymentConfirmationsService);
    paymentMethodsService = module.get(PaymentMethodsService);
    transactionsService = module.get(TransactionsService);
    eventsService = module.get(EventsService);
    ticketsRepository = module.get(TICKETS_REPOSITORY);
    ticketsService = module.get(TicketsService);
    usersService = module.get(UsersService);
  });

  describe('getAdminPayments', () => {
    it('should return enriched payment confirmations', async () => {
      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [mockConfirmationWithTransaction],
        total: 1,
      });
      transactionsService.findByIds.mockResolvedValue([mockTransaction]);

      const result = await service.getAdminPayments(mockCtx);

      expect(result.payments).toHaveLength(1);
      expect(result.total).toBe(1);

      const payment = result.payments[0];
      expect(payment.id).toBe('pc_123');
      expect(payment.transactionId).toBe('txn_123');
      expect(payment.listingId).toBe('listing_123');
      expect(payment.quantity).toBe(2);
      expect(payment.pricePerUnit).toEqual({ amount: 10000, currency: 'USD' });
      expect(payment.sellerPlatformFee).toEqual({
        amount: 1000,
        currency: 'USD',
      });
      expect(payment.buyerPlatformFee).toEqual({
        amount: 2000,
        currency: 'USD',
      });
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
      transactionsService.findByIds.mockResolvedValue([
        transactionWith3Tickets,
      ]);

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
      transactionsService.findByIds.mockResolvedValue([]);

      const result = await service.getAdminPayments(mockCtx);

      expect(result.payments).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should preserve existing transaction enrichment data', async () => {
      paymentConfirmationsService.listPendingConfirmations.mockResolvedValue({
        confirmations: [mockConfirmationWithTransaction],
        total: 1,
      });
      transactionsService.findByIds.mockResolvedValue([mockTransaction]);

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
      transactionsService.findByIds.mockResolvedValue([
        mockTransaction,
        secondTransaction,
      ]);

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
      transactionsService.findByIds.mockResolvedValue([mockTransaction]);

      const result = await service.getAdminPayments(mockCtx);

      const payment = result.payments[0];
      expect(payment.reviewedAt).toBeDefined();
      expect(payment.adminNotes).toBe('Test notes');
    });
  });

  describe('completePayout', () => {
    const completedTransaction = {
      ...mockTransaction,
      id: 'txn_123',
      status: TransactionStatus.Completed,
    };

    it('should complete payout without files and return transaction', async () => {
      transactionsService.completePayout = jest
        .fn()
        .mockResolvedValue(completedTransaction);

      const result = await service.completePayout(
        mockCtx,
        'txn_123',
        'admin_1',
      );

      expect(result.id).toBe('txn_123');
      expect(result.status).toBe(TransactionStatus.Completed);
      expect(transactionsService.completePayout).toHaveBeenCalledWith(
        mockCtx,
        'txn_123',
      );
    });

    it('should upload receipt files and then complete payout when files provided', async () => {
      transactionsService.completePayout = jest
        .fn()
        .mockResolvedValue(completedTransaction);

      const files = [
        {
          buffer: Buffer.from('fake'),
          originalname: 'receipt.pdf',
          mimetype: 'application/pdf',
          size: 100,
        },
      ];

      const result = await service.completePayout(
        mockCtx,
        'txn_123',
        'admin_1',
        files,
      );

      expect(mockPrivateStorage.store).toHaveBeenCalledTimes(1);
      expect(mockPrisma.payoutReceiptFile.create).toHaveBeenCalledTimes(1);
      expect(transactionsService.completePayout).toHaveBeenCalledWith(
        mockCtx,
        'txn_123',
      );
      expect(result.status).toBe(TransactionStatus.Completed);
    });

    it('should throw BadRequestException when file has invalid MIME type', async () => {
      const files = [
        {
          buffer: Buffer.from('fake'),
          originalname: 'file.txt',
          mimetype: 'text/plain',
          size: 100,
        },
      ];

      await expect(
        service.completePayout(mockCtx, 'txn_123', 'admin_1', files),
      ).rejects.toThrow(BadRequestException);
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
        slug: 'updated-event-evt_123',
        name: 'Updated Event',
        category: 'Concert',
        venue: 'Updated Venue',
        location: {
          line1: '123 Main St',
          city: 'Test City',
          countryCode: 'US',
        },
        imageIds: [],
        status: EventStatus.Approved,
        isPopular: false,
        highlight: false,
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
      slug: 'test-concert-evt_123',
      name: 'Test Concert',
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

    const mockUser: User = {
      id: 'user_123',
      email: 'user@test.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      publicName: 'Test User',
      role: Role.User,
      acceptedSellerTermsAt: new Date(),
      status: UserStatus.Enabled,
      imageId: 'img_123',
      country: 'US',
      currency: 'USD',
      language: Language.ES,
      emailVerified: true,
      phoneVerified: false,
      buyerDisputed: false,
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
        new Map([['evt_123', { listingsCount: 5, availableTicketsCount: 20 }]]),
      );

      const result = await service.getAllEvents(mockCtx, {
        page: 1,
        limit: 20,
      });

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
        { page: 1, limit: 20, search: undefined, highlighted: undefined },
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
        { page: 1, limit: 20, search: 'concert', highlighted: undefined },
      );
    });

    it('should pass highlighted=true filter to events service', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [],
        total: 0,
      });

      await service.getAllEvents(mockCtx, { highlighted: true });

      expect(eventsService.getAllEventsPaginated).toHaveBeenCalledWith(
        mockCtx,
        { page: 1, limit: 20, search: undefined, highlighted: true },
      );
    });

    it('should expose squareBannerUrl when event has square banner', async () => {
      const mockBanner = {
        type: 'square' as const,
        filename: 'square.jpg',
        originalFilename: 'square.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1000,
        width: 800,
        height: 800,
        uploadedBy: 'user_123',
        uploadedAt: new Date(),
      };
      const eventWithBanners: Event = {
        ...mockEvent,
        banners: { square: mockBanner, rectangle: { ...mockBanner, type: 'rectangle' as const, filename: 'rectangle.jpg' } },
      };
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [eventWithBanners],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([mockUser]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(new Map());

      const result = await service.getAllEvents(mockCtx, {});

      expect(result.events[0].squareBannerUrl).toBe('https://cdn.example.com/square.jpg');
      expect(result.events[0].hasRectangleBanner).toBe(true);
    });

    it('should not expose squareBannerUrl when event has no square banner', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [mockEvent],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([mockUser]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(new Map());

      const result = await service.getAllEvents(mockCtx, {});

      expect(result.events[0].squareBannerUrl).toBeUndefined();
      expect(result.events[0].hasRectangleBanner).toBe(false);
    });

    it('should return empty result when no events found', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [],
        total: 0,
      });

      const result = await service.getAllEvents(mockCtx, {
        page: 1,
        limit: 20,
      });

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

      const result = await service.getAllEvents(mockCtx, {
        page: 1,
        limit: 20,
      });

      expect(result.totalPages).toBe(3);
    });

    it('should handle unknown users gracefully', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [mockEvent],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(new Map());

      const result = await service.getAllEvents(mockCtx, {
        page: 1,
        limit: 20,
      });

      expect(result.events[0].createdBy.publicName).toBe('Unknown User');
    });

    it('should handle events without listing stats', async () => {
      eventsService.getAllEventsPaginated.mockResolvedValue({
        events: [mockEvent],
        total: 1,
      });
      usersService.findByIds.mockResolvedValue([mockUser]);
      ticketsService.getListingStatsByEventIds.mockResolvedValue(new Map());

      const result = await service.getAllEvents(mockCtx, {
        page: 1,
        limit: 20,
      });

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

      const result = await service.getAllEvents(mockCtx, {
        page: 1,
        limit: 20,
      });

      expect(result.events).toHaveLength(2);
      expect(result.events[0].createdBy.publicName).toBe('Test User');
      expect(result.events[1].createdBy.publicName).toBe('Another User');
    });
  });

  describe('getEventListings', () => {
    const mockEventWithDates = {
      id: 'evt_123',
      name: 'Test Concert',
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
      type: TicketType.Digital,
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
      acceptedSellerTermsAt: new Date(),
      status: UserStatus.Enabled,
      imageId: 'img_123',
      country: 'US',
      currency: 'USD',
      language: Language.ES,
      emailVerified: true,
      phoneVerified: false,
      buyerDisputed: false,
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
        {
          id: 'buyer_123',
          publicName: 'John Buyer',
          email: 'buyer@test.com',
        } as User,
        {
          id: 'seller_123',
          publicName: 'Jane Seller',
          email: 'seller@test.com',
        } as User,
      ]);
      ticketsService.getListingsByIds.mockResolvedValue([
        mockListingWithEvent as any,
      ]);
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
        {
          id: 'seller_123',
          publicName: 'Jane',
          email: 'jane@test.com',
        } as User,
      ]);
      ticketsService.getListingsByIds.mockResolvedValue([
        mockListingWithEvent as any,
      ]);
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
      paymentConfirmationsService.getPendingTransactionIds.mockResolvedValue(
        confirmationIds,
      );
      transactionsService.getIdsByStatuses.mockResolvedValue(pendingTxIds);

      const result = await service.getTransactionsPendingSummary(mockCtx);

      expect(result.pendingConfirmationsCount).toBe(5);
      expect(result.pendingTransactionsCount).toBe(3);
      expect(result.pendingConfirmationTransactionIds).toEqual(confirmationIds);
      expect(result.pendingTransactionIds).toEqual(pendingTxIds);
      expect(
        paymentConfirmationsService.getPendingTransactionIds,
      ).toHaveBeenCalledWith(mockCtx);
      expect(transactionsService.getIdsByStatuses).toHaveBeenCalledWith(
        mockCtx,
        [TransactionStatus.PaymentPendingVerification],
      );
    });

    it('should return zero when no pending confirmations', async () => {
      paymentConfirmationsService.getPendingTransactionIds.mockResolvedValue(
        [],
      );
      transactionsService.getIdsByStatuses.mockResolvedValue([]);

      const result = await service.getTransactionsPendingSummary(mockCtx);

      expect(result.pendingConfirmationsCount).toBe(0);
      expect(result.pendingTransactionsCount).toBe(0);
      expect(result.pendingConfirmationTransactionIds).toEqual([]);
      expect(result.pendingTransactionIds).toEqual([]);
    });
  });

  describe('getTransactionAuditLogs', () => {
    it('should call transactions service and return response', async () => {
      const response = {
        transactionId: 'txn_123',
        total: 2,
        items: [
          {
            id: 'log_1',
            transactionId: 'txn_123',
            action: 'created' as const,
            changedAt: new Date('2025-01-01T10:00:00.000Z'),
            changedBy: 'system',
            payload: { field: 'initial' },
          },
          {
            id: 'log_2',
            transactionId: 'txn_123',
            action: 'updated' as const,
            changedAt: new Date('2025-01-01T12:00:00.000Z'),
            changedBy: 'admin_1',
            payload: { field: 'status' },
          },
        ],
      };
      transactionsService.getTransactionAuditLogs.mockResolvedValue(response);

      const result = await service.getTransactionAuditLogs(
        mockCtx,
        'txn_123',
        'asc',
      );

      expect(transactionsService.getTransactionAuditLogs).toHaveBeenCalledWith(
        mockCtx,
        'txn_123',
        'asc',
      );
      expect(result).toEqual(response);
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

    const mockPaymentMethod = {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      publicName: 'Transferencia Bancaria',
      type: 'manual_approval' as const,
      status: 'enabled' as const,
      buyerCommissionPercent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      paymentMethodsService.findById.mockResolvedValue(
        mockPaymentMethod as any,
      );
    });

    it('should return transaction detail with enriched data', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
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
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([
        mockConfirmation as any,
      ]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.paymentConfirmations).toHaveLength(1);
      expect(result.paymentConfirmations[0].id).toBe('pc_123');
      expect(result.paymentConfirmations[0].originalFilename).toBe(
        'receipt.png',
      );
    });

    it('should include paymentMethodId and paymentMethod (type, name) when present on transaction', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.paymentMethodId).toBe('bank_transfer');
      expect(result.paymentMethod).toEqual({
        id: 'bank_transfer',
        type: 'manual_approval',
        name: 'Transferencia Bancaria',
      });
    });

    it('should include full price breakdown (ticketPrice, buyerPlatformFee, sellerPlatformFee, totalPaid, sellerReceives)', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.ticketPrice).toEqual({ amount: 20000, currency: 'USD' });
      expect(result.buyerPlatformFee).toEqual({
        amount: 2000,
        currency: 'USD',
      });
      expect(result.sellerPlatformFee).toEqual({
        amount: 1000,
        currency: 'USD',
      });
      expect(result.totalPaid).toEqual({ amount: 24400, currency: 'USD' });
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
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
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
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.paymentMethodId).toBeUndefined();
      expect(result.paymentMethod).toBeUndefined();
      expect(result.cancelledAt).toBeUndefined();
      expect(result.refundedAt).toBeUndefined();
      expect(result.paymentApprovedAt).toBeUndefined();
      expect(result.paymentApprovedBy).toBeUndefined();
      expect(result.disputeId).toBeUndefined();
    });

    it('should include appliedPromotion when listing has promotionSnapshot', async () => {
      const listingWithPromotion = {
        ...mockListingWithEvent,
        promotionSnapshot: {
          id: 'promo_456',
          name: 'Early Bird Fee Discount',
          type: 'SELLER_DISCOUNTED_FEE',
          config: { feePercentage: 2 },
        },
      };

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        listingWithPromotion as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.appliedPromotion).toEqual({
        id: 'promo_456',
        name: 'Early Bird Fee Discount',
        type: 'SELLER_DISCOUNTED_FEE',
        config: { feePercentage: 2 },
      });
    });

    it('should omit appliedPromotion when listing has no promotionSnapshot', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.appliedPromotion).toBeUndefined();
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
        acceptedSellerTermsAt: new Date(),
        status: UserStatus.Enabled,
        imageId: '',
        country: 'ES',
        currency: 'EUR',
        language: Language.ES,
        emailVerified: true,
        phoneVerified: false,
        buyerDisputed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bankAccount: {
          holderName: 'Jane Seller',
          cbuOrCvu: 'ES9121000418450200051332',
          verified: true,
        },
      };

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([sellerWithBankAccount]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.bankTransferDestination).toBeDefined();
      expect(result.bankTransferDestination).toEqual({
        holderName: 'Jane Seller',
        cbuOrCvu: 'ES9121000418450200051332',
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
        acceptedSellerTermsAt: new Date(),
        status: UserStatus.Enabled,
        imageId: '',
        country: 'ES',
        currency: 'EUR',
        language: Language.ES,
        emailVerified: true,
        phoneVerified: false,
        buyerDisputed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([sellerWithoutBankAccount]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
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
        acceptedSellerTermsAt: new Date(),
        status: UserStatus.Enabled,
        imageId: '',
        country: 'ES',
        currency: 'EUR',
        language: Language.ES,
        emailVerified: true,
        phoneVerified: false,
        buyerDisputed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bankAccount: {
          holderName: 'Jane Seller',
          cbuOrCvu: 'ES9121000418450200051332',
          verified: true,
        },
      };

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([sellerWithBankAccountNoBic]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.bankTransferDestination).toEqual({
        holderName: 'Jane Seller',
        cbuOrCvu: 'ES9121000418450200051332',
      });
    });

    it('should prefer payment method bankTransferConfig over seller bankAccount when transaction has paymentMethodId', async () => {
      const transactionWithPm: Transaction = {
        ...mockTransaction,
        paymentMethodId: 'pm_bank_123',
      };
      const sellerWithBankAccount: User = {
        id: 'seller_123',
        email: 'jane@test.com',
        password: 'hashed',
        firstName: 'Jane',
        lastName: 'Seller',
        publicName: 'Jane',
        role: Role.User,
        acceptedSellerTermsAt: new Date(),
        status: UserStatus.Enabled,
        imageId: '',
        country: 'ES',
        currency: 'EUR',
        language: Language.ES,
        emailVerified: true,
        phoneVerified: false,
        buyerDisputed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bankAccount: {
          holderName: 'Jane Seller',
          cbuOrCvu: 'ES9121000418450200051332',
          verified: true,
        },
      };
      paymentMethodsService.findById.mockResolvedValue({
        id: 'pm_bank_123',
        name: 'Transferencia',
        publicName: 'Transferencia Bancaria',
        type: 'manual_approval',
        status: 'enabled',
        buyerCommissionPercent: 0,
        bankTransferConfig: {
          cbu: '0720000980000000001234',
          accountHolderName: 'TicketsHub Plataforma',
          bankName: 'Banco Galicia',
          cuitCuil: '30-12345678-9',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      transactionsService.findById.mockResolvedValue(transactionWithPm);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([sellerWithBankAccount]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.bankTransferDestination).toBeDefined();
      expect(result.bankTransferDestination).toEqual({
        holderName: 'TicketsHub Plataforma',
        cbuOrCvu: '0720000980000000001234',
        bankName: 'Banco Galicia',
        cuitCuil: '30-12345678-9',
      });
    });

    it('should include payoutReceiptFiles from db in response', async () => {
      const mockReceipt = {
        id: 'prf_1',
        transactionId: 'txn_123',
        storageKey: 'payout-receipts/txn_123_receipt.pdf',
        originalFilename: 'payout-receipt.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
        uploadedBy: 'admin_1',
        uploadedAt: new Date(),
      };
      mockPrisma.payoutReceiptFile.findMany.mockResolvedValue([mockReceipt]);

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.payoutReceiptFiles).toHaveLength(1);
      expect(result.payoutReceiptFiles[0].id).toBe('prf_1');
      expect(result.payoutReceiptFiles[0].originalFilename).toBe(
        'payout-receipt.pdf',
      );
      expect(result.payoutReceiptFiles[0].contentType).toBe('application/pdf');
    });

    it('should return empty payoutReceiptFiles when none exist', async () => {
      mockPrisma.payoutReceiptFile.findMany.mockResolvedValue([]);

      transactionsService.findById.mockResolvedValue(mockTransaction);
      usersService.findByIds
        .mockResolvedValueOnce([
          { id: 'buyer_123', publicName: 'John', email: 'j@test.com' } as User,
        ])
        .mockResolvedValueOnce([
          {
            id: 'seller_123',
            publicName: 'Jane',
            email: 'jane@test.com',
          } as User,
        ]);
      ticketsService.getListingById.mockResolvedValue(
        mockListingWithEvent as any,
      );
      paymentConfirmationsService.findByTransactionIds.mockResolvedValue([]);

      const result = await service.getTransactionById(mockCtx, 'txn_123');

      expect(result.payoutReceiptFiles).toHaveLength(0);
    });
  });

  describe('getPayoutReceiptFileContent', () => {
    const mockReceiptRecord = {
      id: 'prf_1',
      transactionId: 'txn_123',
      storageKey: 'payout-receipts/txn_123_receipt.pdf',
      originalFilename: 'payout-receipt.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      uploadedBy: 'admin_1',
      uploadedAt: new Date(),
    };

    it('should return file content when record and storage object exist', async () => {
      mockPrisma.payoutReceiptFile.findFirst.mockResolvedValue(
        mockReceiptRecord,
      );
      mockPrivateStorage.retrieve.mockResolvedValue(Buffer.from('pdf-content'));

      const result = await service.getPayoutReceiptFileContent(
        mockCtx,
        'txn_123',
        'prf_1',
      );

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('application/pdf');
      expect(result!.filename).toBe('payout-receipt.pdf');
      expect(result!.buffer).toEqual(Buffer.from('pdf-content'));
    });

    it('should return null when receipt record is not found', async () => {
      mockPrisma.payoutReceiptFile.findFirst.mockResolvedValue(null);

      const result = await service.getPayoutReceiptFileContent(
        mockCtx,
        'txn_123',
        'non_existent',
      );

      expect(result).toBeNull();
      expect(mockPrivateStorage.retrieve).not.toHaveBeenCalled();
    });

    it('should return null when storage object does not exist', async () => {
      mockPrisma.payoutReceiptFile.findFirst.mockResolvedValue(
        mockReceiptRecord,
      );
      mockPrivateStorage.retrieve.mockResolvedValue(null);

      const result = await service.getPayoutReceiptFileContent(
        mockCtx,
        'txn_123',
        'prf_1',
      );

      expect(result).toBeNull();
    });
  });

  describe('validateImportEvents', () => {
    const validPayload = {
      events: [
        {
          name: 'Test Concert',
          category: 'Concert' as const,
          venue: 'Arena',
          location: {
            line1: '123 Main St',
            city: 'Buenos Aires',
            countryCode: 'AR',
          },
          dates: ['2025-07-10T20:00:00.000Z'],
          sections: [
            { name: 'VIP', seatingType: 'numbered' as const },
            { name: 'General', seatingType: 'unnumbered' as const },
          ],
          sourceCode: 'test',
          sourceId: 'test-1',
        },
      ],
    };

    it('should return valid and data when payload is valid', () => {
      const result = service.validateImportEvents(validPayload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.events).toHaveLength(1);
        expect(result.data.events[0].name).toBe('Test Concert');
      }
    });

    it('should return valid false and errors when payload has invalid category', () => {
      const invalid = {
        events: [
          {
            ...validPayload.events[0],
            category: 'InvalidCategory',
          },
        ],
      };
      const result = service.validateImportEvents(invalid);
      expect(result.valid).toBe(false);
      if (result.valid === false) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return valid false when events array is empty', () => {
      const result = service.validateImportEvents({ events: [] });
      expect(result.valid).toBe(false);
      if (result.valid === false) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should return valid false when section names are duplicated', () => {
      const duplicateSections = {
        events: [
          {
            ...validPayload.events[0],
            sections: [
              { name: 'VIP', seatingType: 'numbered' as const },
              { name: 'VIP', seatingType: 'unnumbered' as const },
            ],
          },
        ],
      };
      const result = service.validateImportEvents(duplicateSections);
      expect(result.valid).toBe(false);
    });
  });

  describe('getImportPreview', () => {
    const validPayload = {
      events: [
        {
          name: 'Summer Fest',
          category: 'Festival' as const,
          venue: 'Park',
          location: {
            line1: '1 Park Ave',
            city: 'Cordoba',
            countryCode: 'AR',
          },
          dates: ['2025-08-01T18:00:00.000Z', '2025-08-02T18:00:00.000Z'],
          sections: [{ name: 'General', seatingType: 'unnumbered' as const }],
          sourceCode: 'test',
          sourceId: 'summer-1',
        },
      ],
    };

    it('should return preview with generated slugs and date labels', async () => {
      const result = await service.getImportPreview(mockCtx, validPayload);
      expect(result.events).toHaveLength(1);
      expect(result.eventsForImport).toHaveLength(1);
      expect(result.events[0].name).toBe('Summer Fest');
      expect(result.events[0].slug).toMatch(/summer-fest-park/);
      expect(result.events[0].datesCount).toBe(2);
      expect(result.events[0].dateLabels).toHaveLength(2);
      expect(result.events[0].sections).toHaveLength(1);
      expect(result.events[0].sourceCode).toBe('test');
      expect(result.events[0].sourceId).toBe('summer-1');
    });

    it('should exclude events that already exist in DB by importInfo', async () => {
      eventsService.getExistingImportSourceKeys.mockResolvedValue(
        new Set(['test:summer-1']),
      );
      const result = await service.getImportPreview(mockCtx, validPayload);
      expect(result.events).toHaveLength(0);
      expect(result.eventsForImport).toHaveLength(0);
    });
  });

  describe('executeImport', () => {
    const validPayload = {
      events: [
        {
          name: 'Imported Event',
          category: 'Concert' as const,
          venue: 'Hall',
          location: {
            line1: '50 Center St',
            city: 'Mendoza',
            countryCode: 'AR',
          },
          dates: ['2025-09-15T20:00:00.000Z'],
          sections: [{ name: 'Floor', seatingType: 'numbered' as const }],
          sourceCode: 'test',
          sourceId: 'imported-1',
        },
      ],
    };

    const mockCreatedEvent: Event = {
      id: 'evt_imported1',
      slug: 'imported-event-hall-evt_imported1',
      name: 'Imported Event',
      category: EventCategory.Concert,
      venue: 'Hall',
      location: validPayload.events[0].location,
      imageIds: [],
      status: EventStatus.Approved,
      createdBy: 'admin_1',
      approvedBy: 'admin_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPopular: false,
      highlight: false,
    };

    it('should create event, dates, and sections and return results', async () => {
      eventsService.createEvent.mockResolvedValue(mockCreatedEvent);
      eventsService.addEventDate.mockResolvedValue({} as never);
      eventsService.addEventSection.mockResolvedValue({} as never);

      const result = await service.executeImport(
        mockCtx,
        validPayload,
        'admin_1',
      );

      expect(result.total).toBe(1);
      expect(result.created).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].eventId).toBe('evt_imported1');
      expect(result.results[0].slug).toBe('imported-event-hall-evt_imported1');
      expect(eventsService.createEvent).toHaveBeenCalledWith(
        mockCtx,
        'admin_1',
        Role.Admin,
        expect.objectContaining({
          name: 'Imported Event',
          category: 'Concert',
          venue: 'Hall',
          location: validPayload.events[0].location,
          importInfo: { sourceCode: 'test', sourceId: 'imported-1' },
        }),
      );
      expect(eventsService.addEventDate).toHaveBeenCalledTimes(1);
      expect(eventsService.addEventSection).toHaveBeenCalledTimes(1);
    });

    it('should report failed event and continue with next', async () => {
      eventsService.createEvent
        .mockRejectedValueOnce(new Error('Slug already exists'))
        .mockResolvedValueOnce(mockCreatedEvent);
      eventsService.addEventDate.mockResolvedValue({} as never);
      eventsService.addEventSection.mockResolvedValue({} as never);

      const twoEventsPayload = {
        events: [
          validPayload.events[0],
          { ...validPayload.events[0], name: 'Second Event', sourceId: 'imported-2' },
        ],
      };

      const result = await service.executeImport(
        mockCtx,
        twoEventsPayload,
        'admin_1',
      );

      expect(result.total).toBe(2);
      expect(result.created).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Slug already exists');
      expect(result.results[1].success).toBe(true);
    });

    it('should store base64 images as event banners when provided', async () => {
      const minimalPngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const payloadWithImages = {
        events: [
          {
            ...validPayload.events[0],
            imageSquareBase64: `data:image/png;base64,${minimalPngBase64}`,
            imageRectangleBase64: `data:image/png;base64,${minimalPngBase64}`,
          },
        ],
      };

      eventsService.createEvent.mockResolvedValue(mockCreatedEvent);
      eventsService.addEventDate.mockResolvedValue({} as never);
      eventsService.addEventSection.mockResolvedValue({} as never);
      eventsService.uploadBanner.mockResolvedValue({} as never);

      const result = await service.executeImport(
        mockCtx,
        payloadWithImages,
        'admin_1',
      );

      expect(result.created).toBe(1);
      expect(eventsService.uploadBanner).toHaveBeenCalledTimes(2);
      expect(eventsService.uploadBanner).toHaveBeenCalledWith(
        mockCtx,
        'evt_imported1',
        'admin_1',
        Role.Admin,
        'square',
        expect.objectContaining({
          mimetype: 'image/png',
          originalname: 'square.png',
        }),
      );
      expect(eventsService.uploadBanner).toHaveBeenCalledWith(
        mockCtx,
        'evt_imported1',
        'admin_1',
        Role.Admin,
        'rectangle',
        expect.objectContaining({
          mimetype: 'image/png',
          originalname: 'rectangle.png',
        }),
      );
    });
  });

  describe('searchUsersByEmail', () => {
    it('should call findByEmailContaining with take=20 and return mapped id/email', async () => {
      const mockUsers = [
        { id: 'user_1', email: 'alice@example.com' },
        { id: 'user_2', email: 'alice2@example.com' },
      ];
      usersService.findByEmailContaining.mockResolvedValue(mockUsers as any);

      const result = await service.searchUsersByEmail(mockCtx, 'alice');

      expect(usersService.findByEmailContaining).toHaveBeenCalledWith(mockCtx, 'alice', 20);
      expect(result).toEqual([
        { id: 'user_1', email: 'alice@example.com' },
        { id: 'user_2', email: 'alice2@example.com' },
      ]);
    });

    it('should return [] without calling findByEmailContaining when term is less than 2 chars', async () => {
      const result = await service.searchUsersByEmail(mockCtx, 'a');

      expect(usersService.findByEmailContaining).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return [] without calling findByEmailContaining when term is empty string', async () => {
      const result = await service.searchUsersByEmail(mockCtx, '');

      expect(usersService.findByEmailContaining).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
