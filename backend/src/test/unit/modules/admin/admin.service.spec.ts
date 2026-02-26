import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../../../../modules/admin/admin.service';
import { PaymentConfirmationsService } from '../../../../modules/payment-confirmations/payment-confirmations.service';
import { TransactionsService } from '../../../../modules/transactions/transactions.service';
import { EventsService } from '../../../../modules/events/events.service';
import { TicketsRepository } from '../../../../modules/tickets/tickets.repository';
import { PaymentConfirmationStatus } from '../../../../modules/payment-confirmations/payment-confirmations.domain';
import { TransactionStatus } from '../../../../modules/transactions/transactions.domain';
import { TicketType } from '../../../../modules/tickets/tickets.domain';
import { EventStatus, EventDateStatus } from '../../../../modules/events/events.domain';
import type { Ctx } from '../../../../common/types/context';
import type { Transaction } from '../../../../modules/transactions/transactions.domain';
import type { PaymentConfirmationWithTransaction } from '../../../../modules/payment-confirmations/payment-confirmations.api';
import type { AdminUpdateEventResponse } from '../../../../modules/admin/admin.api';

describe('AdminService', () => {
  let service: AdminService;
  let paymentConfirmationsService: jest.Mocked<PaymentConfirmationsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let eventsService: jest.Mocked<EventsService>;

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
    };

    const mockTransactionsService = {
      findById: jest.fn(),
    };

    const mockEventsService = {
      getPendingEvents: jest.fn().mockResolvedValue([]),
      adminUpdateEventWithDates: jest.fn(),
    };

    const mockTicketsRepository = {
      getAll: jest.fn().mockResolvedValue([]),
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
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    paymentConfirmationsService = module.get(PaymentConfirmationsService);
    transactionsService = module.get(TransactionsService);
    eventsService = module.get(EventsService);
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

  describe('updateEventWithDates', () => {
    const mockUpdateResponse: AdminUpdateEventResponse = {
      event: {
        id: 'evt_123',
        name: 'Updated Event',
        description: 'Updated description',
        category: 'Concert',
        venue: 'Updated Venue',
        location: { line1: '123 Main St', city: 'Test City', countryCode: 'US' },
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
      eventsService.adminUpdateEventWithDates.mockResolvedValue(mockUpdateResponse);

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
      eventsService.adminUpdateEventWithDates.mockResolvedValue(responseWithDeletes);

      const result = await service.updateEventWithDates(
        mockCtx,
        'evt_123',
        { datesToDelete: ['edt_456', 'edt_789'] },
        'admin_123',
      );

      expect(result.deletedDateIds).toEqual(['edt_456', 'edt_789']);
      expect(result.warnings).toContain('Cancelled 2 listing(s) for deleted date edt_456');
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
      eventsService.adminUpdateEventWithDates.mockResolvedValue(responseWithNewDate);

      const result = await service.updateEventWithDates(
        mockCtx,
        'evt_123',
        {
          dates: [
            { date: '2025-06-01T19:00:00Z', status: 'approved' },
          ],
        },
        'admin_123',
      );

      expect(result.dates).toHaveLength(2);
    });
  });
});
