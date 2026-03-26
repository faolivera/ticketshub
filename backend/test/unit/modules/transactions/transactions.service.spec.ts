import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { TRANSACTIONS_REPOSITORY } from '../../../../src/modules/transactions/transactions.repository.interface';
import type { ITransactionsRepository } from '../../../../src/modules/transactions/transactions.repository.interface';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { PaymentsService } from '../../../../src/modules/payments/payments.service';
import { WalletService } from '../../../../src/modules/wallet/wallet.service';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { PricingService } from '../../../../src/modules/payments/pricing/pricing.service';
import { NotificationsService } from '../../../../src/modules/notifications/notifications.service';
import { OffersService } from '../../../../src/modules/offers/offers.service';
import { TransactionManager } from '../../../../src/common/database';
import { RiskEngineService } from '../../../../src/modules/risk-engine/risk-engine.service';
import { TermsService } from '../../../../src/modules/terms/terms.service';
import { EventScoringService } from '../../../../src/modules/event-scoring/event-scoring.service';
import { GatewayPaymentsService } from '../../../../src/modules/gateways/gateway-payments.service';
import { EventsService } from '../../../../src/modules/events/events.service';
import { PRIVATE_STORAGE_PROVIDER } from '../../../../src/common/storage/file-storage-provider.interface';
import { IdentityVerificationStatus } from '../../../../src/modules/users/users.domain';
import {
  TransactionStatus,
  RequiredActor,
  CancellationReason,
  STATUS_REQUIRED_ACTOR,
  PROOF_FILE_MAX_SIZE_BYTES,
} from '../../../../src/modules/transactions/transactions.domain';
import { TicketType } from '../../../../src/modules/tickets/tickets.domain';
import type { Transaction } from '../../../../src/modules/transactions/transactions.domain';
import type { Ctx } from '../../../../src/common/types/context';
import type { TxCtx } from '../../../../src/common/database/types';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let moduleRef: TestingModule;
  let transactionsRepository: jest.Mocked<ITransactionsRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let termsService: jest.Mocked<TermsService>;
  let walletService: jest.Mocked<WalletService>;
  let txManager: jest.Mocked<TransactionManager>;
  let eventsService: jest.Mocked<EventsService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const createMockTransaction = (
    overrides: Partial<Transaction> = {},
  ): Transaction => ({
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
    createdAt: new Date(),
    paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    updatedAt: new Date(),
    version: 1,
    buyerDeliveryEmail: null,
    ...overrides,
  });

  beforeEach(async () => {
    const mockTransactionsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      update: jest.fn(),
      updateWithVersion: jest.fn(),
      getByBuyerId: jest.fn(),
      getBySellerId: jest.fn(),
      countCompletedBySellerId: jest.fn(),
      countCompletedByBuyerId: jest.fn(),
      getByListingId: jest.fn(),
      getByListingIds: jest.fn(),
      getPendingDepositRelease: jest.fn(),
      findExpiredPendingPayments: jest.fn(),
      findExpiredAdminReviews: jest.fn(),
      getPaginated: jest.fn(),
      getAuditLogsByTransactionId: jest.fn(),
      countByStatuses: jest.fn(),
      getIdsByStatuses: jest.fn(),
      findByIds: jest.fn(),
    };

    const mockTicketsService = {
      getListingById: jest.fn(),
      reserveTickets: jest.fn(),
      restoreTickets: jest.fn(),
    };

    const mockPaymentsService = {
      createPaymentIntent: jest.fn(),
      getPaymentByTransactionId: jest.fn(),
      refundPayment: jest.fn(),
    };

    const mockWalletService = {
      holdFunds: jest.fn(),
      releaseFunds: jest.fn(),
      refundHeldFunds: jest.fn(),
    };

    const mockPlatformConfigService = {
      getPlatformConfig: jest.fn().mockResolvedValue({
        buyerPlatformFeePercentage: 10,
        sellerPlatformFeePercentage: 5,
        paymentTimeoutMinutes: 10,
        adminReviewTimeoutHours: 24,
        offerPendingExpirationMinutes: 1440,
        offerAcceptedExpirationMinutes: 1440,
        riskEngine: {
          buyer: {},
          seller: {
            unverifiedSellerMaxSales: 2,
            unverifiedSellerMaxAmount: { amount: 20000, currency: 'USD' },
            payoutHoldHoursDefault: 24,
            payoutHoldHoursUnverified: 48,
          },
        },
      }),
    };

    const mockUsersService = {
      findById: jest.fn(),
      getPublicUserInfoByIds: jest.fn(),
    };

    const mockPaymentMethodsService = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
    };

    const mockPricingService = {
      validateAndConsume: jest.fn(),
    };

    const mockNotificationsService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const mockOffersService = {
      markConverted: jest.fn().mockResolvedValue(undefined),
      cancelAffectedOffers: jest.fn().mockResolvedValue(undefined),
    };

    const mockRiskEngineService = {
      evaluateCheckoutRisk: jest.fn().mockResolvedValue({
        riskLevel: 'LOW',
        requireV1: true,
        requireV2: false,
        requireV3: false,
      }),
      evaluate: jest.fn().mockResolvedValue({
        riskLevel: 'LOW',
        requireV1: true,
        requireV2: false,
        requireV3: false,
      }),
    };

    const mockTermsService = {
      hasAcceptedCurrentTerms: jest.fn().mockResolvedValue(true),
    };

    const mockTxManager = {
      executeInTransaction: jest
        .fn()
        .mockImplementation(
          async (_ctx: Ctx, fn: (txCtx: TxCtx) => Promise<unknown>) => {
            const txCtx = { ..._ctx, tx: {} } as TxCtx;
            return fn(txCtx);
          },
        ),
      getClient: jest.fn(),
    };

    const mockPrivateStorage = {
      store: jest
        .fn()
        .mockResolvedValue({ key: 'test-key', metadata: {}, location: '' }),
      retrieve: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    const mockEventScoringService = {
      requestScoring: jest.fn().mockResolvedValue(undefined),
    };

    const mockGatewayPaymentsService = {
      createOrder: jest.fn().mockResolvedValue({ providerOrderId: 'order_1', checkoutUrl: 'https://checkout.example.com' }),
      handleTransactionCancelled: jest.fn().mockResolvedValue(undefined),
    };

    const mockEventsService = {
      assertEventDateNotExpired: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TRANSACTIONS_REPOSITORY,
          useValue: mockTransactionsRepository,
        },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: PlatformConfigService, useValue: mockPlatformConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: PricingService, useValue: mockPricingService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: OffersService, useValue: mockOffersService },
        { provide: RiskEngineService, useValue: mockRiskEngineService },
        { provide: TermsService, useValue: mockTermsService },
        { provide: TransactionManager, useValue: mockTxManager },
        { provide: PRIVATE_STORAGE_PROVIDER, useValue: mockPrivateStorage },
        { provide: EventScoringService, useValue: mockEventScoringService },
        { provide: GatewayPaymentsService, useValue: mockGatewayPaymentsService },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    moduleRef = module;
    service = module.get<TransactionsService>(TransactionsService);
    transactionsRepository = module.get(TRANSACTIONS_REPOSITORY);
    ticketsService = module.get(TicketsService);
    termsService = module.get(TermsService);
    walletService = module.get(WalletService);
    txManager = module.get(TransactionManager);
    eventsService = module.get(EventsService);
  });

  describe('cancelTransaction', () => {
    it('should cancel a PendingPayment transaction and restore tickets atomically', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        requiredActor: STATUS_REQUIRED_ACTOR[TransactionStatus.Cancelled],
        cancelledAt: expect.any(Date),
        cancelledBy: RequiredActor.Buyer,
        cancellationReason: CancellationReason.BuyerCancelled,
        version: 2,
      });
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelTransaction(
        mockCtx,
        'txn_123',
        RequiredActor.Buyer,
        CancellationReason.BuyerCancelled,
      );

      expect(result.status).toBe(TransactionStatus.Cancelled);
      expect(txManager.executeInTransaction).toHaveBeenCalled();
      expect(ticketsService.restoreTickets).toHaveBeenCalledWith(
        expect.objectContaining({ tx: expect.anything() }),
        'listing_123',
        ['unit_1', 'unit_2'],
      );
      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.objectContaining({ tx: expect.anything() }),
        'txn_123',
        expect.objectContaining({
          status: TransactionStatus.Cancelled,
          cancelledBy: RequiredActor.Buyer,
          cancellationReason: CancellationReason.BuyerCancelled,
        }),
        1,
      );
    });

    it('should cancel a PaymentPendingVerification transaction', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentPendingVerification,
        requiredActor: RequiredActor.Platform,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        requiredActor: STATUS_REQUIRED_ACTOR[TransactionStatus.Cancelled],
        cancelledBy: RequiredActor.Platform,
        cancellationReason: CancellationReason.AdminRejected,
        version: 2,
      });
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelTransaction(
        mockCtx,
        'txn_123',
        RequiredActor.Platform,
        CancellationReason.AdminRejected,
      );

      expect(result.status).toBe(TransactionStatus.Cancelled);
      expect(ticketsService.restoreTickets).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findByIdForUpdate.mockResolvedValue(undefined);

      await expect(
        service.cancelTransaction(
          mockCtx,
          'invalid_id',
          RequiredActor.Buyer,
          CancellationReason.BuyerCancelled,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction is Completed', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.Completed,
        requiredActor: RequiredActor.None,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.cancelTransaction(
          mockCtx,
          'txn_123',
          RequiredActor.Buyer,
          CancellationReason.BuyerCancelled,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when transaction is PaymentReceived', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        requiredActor: RequiredActor.Seller,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.cancelTransaction(
          mockCtx,
          'txn_123',
          RequiredActor.Buyer,
          CancellationReason.BuyerCancelled,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when transaction is already Cancelled', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.Cancelled,
        requiredActor: RequiredActor.None,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.cancelTransaction(
          mockCtx,
          'txn_123',
          RequiredActor.Buyer,
          CancellationReason.BuyerCancelled,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelExpiredPendingPayments', () => {
    it('should cancel all expired pending payments and return count', async () => {
      const expiredTransactions = [
        createMockTransaction({ id: 'txn_1' }),
        createMockTransaction({ id: 'txn_2' }),
      ];

      transactionsRepository.findExpiredPendingPayments.mockResolvedValue(
        expiredTransactions,
      );
      transactionsRepository.findByIdForUpdate.mockImplementation(
        async (_ctx, id) => expiredTransactions.find((t) => t.id === id),
      );
      transactionsRepository.updateWithVersion.mockImplementation(
        async (_ctx, id) => ({
          ...expiredTransactions.find((t) => t.id === id)!,
          status: TransactionStatus.Cancelled,
          requiredActor: RequiredActor.None,
          cancelledBy: RequiredActor.Platform,
          cancellationReason: CancellationReason.PaymentTimeout,
          version: 2,
        }),
      );
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelExpiredPendingPayments(mockCtx);

      expect(result).toBe(2);
      expect(ticketsService.restoreTickets).toHaveBeenCalledTimes(2);
      expect(
        transactionsRepository.findExpiredPendingPayments,
      ).toHaveBeenCalledWith(mockCtx);
    });

    it('should return 0 when no expired transactions exist', async () => {
      transactionsRepository.findExpiredPendingPayments.mockResolvedValue([]);

      const result = await service.cancelExpiredPendingPayments(mockCtx);

      expect(result).toBe(0);
      expect(ticketsService.restoreTickets).not.toHaveBeenCalled();
    });

    it('should continue processing remaining transactions when one fails', async () => {
      const expiredTransactions = [
        createMockTransaction({ id: 'txn_1' }),
        createMockTransaction({ id: 'txn_2' }),
        createMockTransaction({ id: 'txn_3' }),
      ];

      transactionsRepository.findExpiredPendingPayments.mockResolvedValue(
        expiredTransactions,
      );
      transactionsRepository.findByIdForUpdate.mockImplementation(
        async (_ctx, id) => {
          if (id === 'txn_2') return undefined;
          return expiredTransactions.find((t) => t.id === id);
        },
      );
      transactionsRepository.updateWithVersion.mockImplementation(
        async (_ctx, id) => ({
          ...expiredTransactions.find((t) => t.id === id)!,
          status: TransactionStatus.Cancelled,
          version: 2,
        }),
      );
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelExpiredPendingPayments(mockCtx);

      expect(result).toBe(2);
    });
  });

  describe('cancelExpiredAdminReviews', () => {
    it('should cancel all expired admin reviews and return count', async () => {
      const expiredTransactions = [
        createMockTransaction({
          id: 'txn_1',
          status: TransactionStatus.PaymentPendingVerification,
          requiredActor: RequiredActor.Platform,
          adminReviewExpiresAt: new Date(Date.now() - 1000),
        }),
      ];

      transactionsRepository.findExpiredAdminReviews.mockResolvedValue(
        expiredTransactions,
      );
      transactionsRepository.findByIdForUpdate.mockResolvedValue(
        expiredTransactions[0],
      );
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...expiredTransactions[0],
        status: TransactionStatus.Cancelled,
        requiredActor: RequiredActor.None,
        cancelledBy: RequiredActor.Platform,
        cancellationReason: CancellationReason.AdminReviewTimeout,
        version: 2,
      });
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelExpiredAdminReviews(mockCtx);

      expect(result).toBe(1);
      expect(
        transactionsRepository.findExpiredAdminReviews,
      ).toHaveBeenCalledWith(mockCtx);
    });

    it('should return 0 when no expired admin reviews exist', async () => {
      transactionsRepository.findExpiredAdminReviews.mockResolvedValue([]);

      const result = await service.cancelExpiredAdminReviews(mockCtx);

      expect(result).toBe(0);
    });
  });

  describe('handlePaymentFailed', () => {
    it('should cancel transaction on payment failure', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        requiredActor: RequiredActor.None,
        cancelledBy: RequiredActor.Platform,
        cancellationReason: CancellationReason.PaymentFailed,
        version: 2,
      });
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.handlePaymentFailed(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.Cancelled);
      expect(result.cancellationReason).toBe(CancellationReason.PaymentFailed);
      expect(result.cancelledBy).toBe(RequiredActor.Platform);
      expect(txManager.executeInTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findByIdForUpdate.mockResolvedValue(undefined);

      await expect(
        service.handlePaymentFailed(mockCtx, 'invalid_id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction is not in cancellable status', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.handlePaymentFailed(mockCtx, 'txn_123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handlePaymentConfirmationUploaded', () => {
    it('should transition to PaymentPendingVerification status atomically', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.PaymentPendingVerification,
        requiredActor: RequiredActor.Platform,
        adminReviewExpiresAt: expect.any(Date),
        version: 2,
      });

      const result = await service.handlePaymentConfirmationUploaded(
        mockCtx,
        'txn_123',
      );

      expect(result.status).toBe(TransactionStatus.PaymentPendingVerification);
      expect(txManager.executeInTransaction).toHaveBeenCalled();
      expect(transactionsRepository.findByIdForUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: mockCtx.requestId }),
        'txn_123',
      );
      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: mockCtx.requestId }),
        'txn_123',
        expect.objectContaining({
          status: TransactionStatus.PaymentPendingVerification,
          requiredActor: RequiredActor.Platform,
        }),
        transaction.version,
      );
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findByIdForUpdate.mockResolvedValue(undefined);

      await expect(
        service.handlePaymentConfirmationUploaded(mockCtx, 'invalid_id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction is not PendingPayment', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.handlePaymentConfirmationUploaded(mockCtx, 'txn_123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handlePaymentReceived', () => {
    it('should hold funds and transition to PaymentReceived status atomically', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      walletService.holdFunds.mockResolvedValue(undefined);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.PaymentReceived,
        requiredActor: RequiredActor.Seller,
        paymentReceivedAt: expect.any(Date),
        version: 2,
      });
      ticketsService.getListingById.mockResolvedValue({
        id: 'listing_123',
        eventName: 'Test Event',
      } as never);

      const result = await service.handlePaymentReceived(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.PaymentReceived);
      expect(txManager.executeInTransaction).toHaveBeenCalled();
      expect(walletService.holdFunds).toHaveBeenCalledWith(
        expect.objectContaining({ tx: expect.anything() }),
        'seller_123',
        transaction.sellerReceives,
        'txn_123',
        'Payment for ticket sale',
      );
    });

    it('should accept PaymentPendingVerification status', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentPendingVerification,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      walletService.holdFunds.mockResolvedValue(undefined);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.PaymentReceived,
        version: 2,
      });
      ticketsService.getListingById.mockResolvedValue({
        id: 'listing_123',
        eventName: 'Test Event',
      } as never);

      const result = await service.handlePaymentReceived(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.PaymentReceived);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findByIdForUpdate.mockResolvedValue(undefined);

      await expect(
        service.handlePaymentReceived(mockCtx, 'invalid_id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction status is invalid', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.handlePaymentReceived(mockCtx, 'txn_123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent double escrow hold with pessimistic lock', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      walletService.holdFunds.mockResolvedValue(undefined);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.PaymentReceived,
        version: 2,
      });
      ticketsService.getListingById.mockResolvedValue({
        id: 'listing_123',
        eventName: 'Test Event',
      } as never);

      await service.handlePaymentReceived(mockCtx, 'txn_123');

      expect(transactionsRepository.findByIdForUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ tx: expect.anything() }),
        'txn_123',
      );
      expect(walletService.holdFunds).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return transaction when found', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findById.mockResolvedValue(transaction);

      const result = await service.findById(mockCtx, 'txn_123');

      expect(result).toEqual(transaction);
    });

    it('should return null when transaction not found', async () => {
      transactionsRepository.findById.mockResolvedValue(undefined);

      const result = await service.findById(mockCtx, 'invalid_id');

      expect(result).toBeNull();
    });
  });

  describe('getTransactionAuditLogs', () => {
    it('should return audit logs response when transaction exists', async () => {
      const transaction = createMockTransaction({ id: 'txn_123' });
      const auditDateOld = new Date('2025-01-01T10:00:00.000Z');
      const auditDateNew = new Date('2025-01-01T12:00:00.000Z');
      transactionsRepository.findById.mockResolvedValue(transaction);
      transactionsRepository.getAuditLogsByTransactionId.mockResolvedValue({
        total: 2,
        items: [
          {
            id: 'log_1',
            transactionId: 'txn_123',
            action: 'updated',
            changedAt: auditDateNew,
            changedBy: 'admin_1',
            payload: { field: 'status' },
          },
          {
            id: 'log_2',
            transactionId: 'txn_123',
            action: 'created',
            changedAt: auditDateOld,
            changedBy: 'system',
            payload: { field: 'initial' },
          },
        ],
      });

      const result = await service.getTransactionAuditLogs(
        mockCtx,
        'txn_123',
        'desc',
      );

      expect(transactionsRepository.getAuditLogsByTransactionId).toHaveBeenCalledWith(
        mockCtx,
        'txn_123',
        'desc',
      );
      expect(result).toEqual({
        transactionId: 'txn_123',
        total: 2,
        items: [
          expect.objectContaining({
            id: 'log_1',
            transactionId: 'txn_123',
            action: 'updated',
            changedAt: auditDateNew,
          }),
          expect.objectContaining({
            id: 'log_2',
            transactionId: 'txn_123',
            action: 'created',
            changedAt: auditDateOld,
          }),
        ],
      });
      expect(result.items[0].changedAt.getTime()).toBeGreaterThan(
        result.items[1].changedAt.getTime(),
      );
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      transactionsRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.getTransactionAuditLogs(mockCtx, 'missing_txn', 'asc'),
      ).rejects.toThrow(NotFoundException);
      expect(
        transactionsRepository.getAuditLogsByTransactionId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('hasCompletedTransactionsForListings', () => {
    it('should return true when completed transactions exist', async () => {
      const transactions = [
        createMockTransaction({ status: TransactionStatus.Completed }),
      ];
      transactionsRepository.getByListingIds.mockResolvedValue(transactions);

      const result = await service.hasCompletedTransactionsForListings(
        mockCtx,
        ['listing_123'],
      );

      expect(result).toBe(true);
    });

    it('should return false when no completed transactions exist', async () => {
      const transactions = [
        createMockTransaction({ status: TransactionStatus.PendingPayment }),
      ];
      transactionsRepository.getByListingIds.mockResolvedValue(transactions);

      const result = await service.hasCompletedTransactionsForListings(
        mockCtx,
        ['listing_123'],
      );

      expect(result).toBe(false);
    });

    it('should return false for empty listing IDs array', async () => {
      const result = await service.hasCompletedTransactionsForListings(
        mockCtx,
        [],
      );

      expect(result).toBe(false);
      expect(transactionsRepository.getByListingIds).not.toHaveBeenCalled();
    });
  });

  describe('confirmReceipt', () => {
    it('should transition to DepositHold without releasing funds', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        requiredActor: RequiredActor.Buyer,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.DepositHold,
        requiredActor: RequiredActor.None,
        buyerConfirmedAt: expect.any(Date),
        version: 2,
      });

      const result = await service.confirmReceipt(
        mockCtx,
        'txn_123',
        'buyer_123',
      );

      expect(result.status).toBe(TransactionStatus.DepositHold);
      expect(txManager.executeInTransaction).toHaveBeenCalled();
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.objectContaining({ tx: expect.anything() }),
        'txn_123',
        expect.objectContaining({
          status: TransactionStatus.DepositHold,
          buyerConfirmedAt: expect.any(Date),
        }),
        1,
      );
    });

    it('should throw ForbiddenException when called by non-buyer', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.confirmReceipt(mockCtx, 'txn_123', 'other_user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when status is not TicketTransferred', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.confirmReceipt(mockCtx, 'txn_123', 'buyer_123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findByIdForUpdate.mockResolvedValue(undefined);

      await expect(
        service.confirmReceipt(mockCtx, 'invalid_id', 'buyer_123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use version check when updating to DepositHold', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        version: 3,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.DepositHold,
        version: 4,
      });

      await service.confirmReceipt(mockCtx, 'txn_123', 'buyer_123');

      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.objectContaining({ tx: expect.anything() }),
        'txn_123',
        expect.objectContaining({
          status: TransactionStatus.DepositHold,
        }),
        3,
      );
    });

    it('should persist receiptProofStorageKey and receiptProofOriginalFilename when provided', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        requiredActor: RequiredActor.Buyer,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.DepositHold,
        requiredActor: RequiredActor.None,
        buyerConfirmedAt: expect.any(Date),
        receiptProofStorageKey: 'receipt-proofs/txn_123/xyz.pdf',
        receiptProofOriginalFilename: 'receipt.pdf',
        version: 2,
      });

      const result = await service.confirmReceipt(
        mockCtx,
        'txn_123',
        'buyer_123',
        'receipt-proofs/txn_123/xyz.pdf',
        'receipt.pdf',
      );

      expect(result.receiptProofStorageKey).toBe(
        'receipt-proofs/txn_123/xyz.pdf',
      );
      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.anything(),
        'txn_123',
        expect.objectContaining({
          receiptProofStorageKey: 'receipt-proofs/txn_123/xyz.pdf',
          receiptProofOriginalFilename: 'receipt.pdf',
        }),
        1,
      );
    });
  });

  describe('uploadTransferProof', () => {
    const validFile = {
      buffer: Buffer.from('proof'),
      originalname: 'proof.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    };

    it('should return storageKey when seller uploads and status is PaymentReceived', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        sellerId: 'seller_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      const result = await service.uploadTransferProof(
        mockCtx,
        'txn_123',
        'seller_123',
        validFile,
      );

      expect(result.storageKey).toMatch(
        /^transfer-proofs\/txn_123\/[a-f0-9]+\.pdf$/,
      );
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.uploadTransferProof(
          mockCtx,
          'txn_123',
          'seller_123',
          validFile,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-seller uploads', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        sellerId: 'seller_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.uploadTransferProof(
          mockCtx,
          'txn_123',
          'other_user',
          validFile,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when status is not PaymentReceived or TicketTransferred', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PendingPayment,
        sellerId: 'seller_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.uploadTransferProof(
          mockCtx,
          'txn_123',
          'seller_123',
          validFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds max size', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        sellerId: 'seller_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.uploadTransferProof(mockCtx, 'txn_123', 'seller_123', {
          ...validFile,
          size: PROOF_FILE_MAX_SIZE_BYTES + 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when MIME type not allowed', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        sellerId: 'seller_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.uploadTransferProof(mockCtx, 'txn_123', 'seller_123', {
          ...validFile,
          mimetype: 'application/zip',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadReceiptProof', () => {
    const validFile = {
      buffer: Buffer.from('proof'),
      originalname: 'receipt.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    };

    it('should return storageKey when buyer uploads and status is TicketTransferred', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        buyerId: 'buyer_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      const result = await service.uploadReceiptProof(
        mockCtx,
        'txn_123',
        'buyer_123',
        validFile,
      );

      expect(result.storageKey).toMatch(
        /^receipt-proofs\/txn_123\/[a-f0-9]+\.pdf$/,
      );
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.uploadReceiptProof(mockCtx, 'txn_123', 'buyer_123', validFile),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-buyer uploads', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        buyerId: 'buyer_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.uploadReceiptProof(mockCtx, 'txn_123', 'other_user', validFile),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when status is not TicketTransferred', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        buyerId: 'buyer_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.uploadReceiptProof(mockCtx, 'txn_123', 'buyer_123', validFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds max size', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        buyerId: 'buyer_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.uploadReceiptProof(mockCtx, 'txn_123', 'buyer_123', {
          ...validFile,
          size: PROOF_FILE_MAX_SIZE_BYTES + 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when MIME type not allowed', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        buyerId: 'buyer_123',
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.uploadReceiptProof(mockCtx, 'txn_123', 'buyer_123', {
          ...validFile,
          mimetype: 'text/plain',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processDepositReleases', () => {
    it('should transition TicketTransferred to TransferringFund when depositReleaseAt passed', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        depositReleaseAt: new Date(Date.now() - 1000),
      });
      transactionsRepository.getPendingDepositRelease.mockResolvedValue([
        transaction,
      ]);
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.TransferringFund,
        requiredActor: RequiredActor.Platform,
        version: 2,
      });

      const count = await service.processDepositReleases(mockCtx);

      expect(count).toBe(1);
      expect(
        transactionsRepository.getPendingDepositRelease,
      ).toHaveBeenCalledWith(mockCtx);
      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.anything(),
        transaction.id,
        expect.objectContaining({
          status: TransactionStatus.TransferringFund,
          requiredActor: RequiredActor.Platform,
        }),
        1,
      );
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
    });

    it('should return 0 when no pending deposit releases', async () => {
      transactionsRepository.getPendingDepositRelease.mockResolvedValue([]);

      const count = await service.processDepositReleases(mockCtx);

      expect(count).toBe(0);
      expect(transactionsRepository.updateWithVersion).not.toHaveBeenCalled();
    });

    it('should not transition Disputed transactions to TransferringFund', async () => {
      const disputedTransaction = createMockTransaction({
        status: TransactionStatus.Disputed,
        depositReleaseAt: new Date(Date.now() - 1000),
      });
      transactionsRepository.getPendingDepositRelease.mockResolvedValue([
        disputedTransaction,
      ]);
      transactionsRepository.findByIdForUpdate.mockResolvedValue(
        disputedTransaction,
      );

      const count = await service.processDepositReleases(mockCtx);

      expect(count).toBe(0);
      expect(transactionsRepository.updateWithVersion).not.toHaveBeenCalled();
    });
  });

  describe('completePayout', () => {
    it('should release funds and set Completed when status is TransferringFund', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TransferringFund,
        requiredActor: RequiredActor.Platform,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      const usersService = moduleRef.get(
        UsersService,
      ) as jest.Mocked<UsersService>;
      usersService.findById.mockResolvedValue({
        id: 'seller_123',
        identityVerification: { status: IdentityVerificationStatus.Approved },
        bankAccount: { verified: true },
      } as never);
      walletService.releaseFunds.mockResolvedValue({} as never);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Completed,
        requiredActor: RequiredActor.None,
        completedAt: expect.any(Date),
        version: 2,
      });
      ticketsService.getListingById.mockResolvedValue({
        id: 'listing_123',
        eventName: 'Test Event',
      } as never);

      const result = await service.completePayout(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.Completed);
      expect(walletService.releaseFunds).toHaveBeenCalledWith(
        expect.objectContaining({ tx: expect.anything() }),
        'seller_123',
        transaction.sellerReceives,
        'txn_123',
        'Payment released for ticket sale',
      );
      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.anything(),
        'txn_123',
        expect.objectContaining({
          status: TransactionStatus.Completed,
          completedAt: expect.any(Date),
        }),
        1,
      );
    });

    it('should throw BadRequestException when status is not TransferringFund', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.DepositHold,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(service.completePayout(mockCtx, 'txn_123')).rejects.toThrow(
        BadRequestException,
      );
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findByIdForUpdate.mockResolvedValue(undefined);

      await expect(
        service.completePayout(mockCtx, 'invalid_id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when seller has not completed V3 and V4', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TransferringFund,
        requiredActor: RequiredActor.Platform,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      const usersService = moduleRef.get(
        UsersService,
      ) as jest.Mocked<UsersService>;
      usersService.findById.mockResolvedValue({
        id: 'seller_123',
        identityVerification: undefined,
        bankAccount: undefined,
      } as never);

      const err = await service
        .completePayout(mockCtx, 'txn_123')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).message).toMatch(
        /identity verification.*bank account/i,
      );
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
    });
  });

  describe('confirmTransfer', () => {
    it('should transition to TicketTransferred atomically', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        requiredActor: RequiredActor.Seller,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.TicketTransferred,
        requiredActor: RequiredActor.Buyer,
        ticketTransferredAt: expect.any(Date),
        version: 2,
      });
      ticketsService.getListingById.mockResolvedValue({
        id: 'listing_123',
        eventName: 'Test Event',
        eventDate: new Date(),
        venue: 'Test Venue',
      } as never);

      const result = await service.confirmTransfer(
        mockCtx,
        'txn_123',
        'seller_123',
      );

      expect(result.status).toBe(TransactionStatus.TicketTransferred);
      expect(txManager.executeInTransaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when called by non-seller', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.confirmTransfer(mockCtx, 'txn_123', 'other_user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when status is not PaymentReceived', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PendingPayment,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);

      await expect(
        service.confirmTransfer(mockCtx, 'txn_123', 'seller_123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should persist transferProofStorageKey and transferProofOriginalFilename when provided', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        requiredActor: RequiredActor.Seller,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.TicketTransferred,
        requiredActor: RequiredActor.Buyer,
        ticketTransferredAt: expect.any(Date),
        transferProofStorageKey: 'transfer-proofs/txn_123/abc.pdf',
        transferProofOriginalFilename: 'proof.pdf',
        version: 2,
      });
      ticketsService.getListingById.mockResolvedValue({
        id: 'listing_123',
        eventName: 'Test Event',
        eventDate: new Date(),
        venue: 'Test Venue',
      } as never);

      const result = await service.confirmTransfer(
        mockCtx,
        'txn_123',
        'seller_123',
        undefined,
        'transfer-proofs/txn_123/abc.pdf',
        'proof.pdf',
      );

      expect(result.transferProofStorageKey).toBe(
        'transfer-proofs/txn_123/abc.pdf',
      );
      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.anything(),
        'txn_123',
        expect.objectContaining({
          transferProofStorageKey: 'transfer-proofs/txn_123/abc.pdf',
          transferProofOriginalFilename: 'proof.pdf',
        }),
        1,
      );
    });
  });

  describe('initiatePurchase', () => {
    it('should throw ForbiddenException when buyer has not accepted terms and conditions', async () => {
      const listingId = 'listing_1';
      const buyerId = 'buyer_1';
      const sellerId = 'seller_1';
      ticketsService.getListingById.mockResolvedValue({
        id: listingId,
        sellerId,
        eventDate: new Date(),
        pricePerTicket: { amount: 1000, currency: 'USD' },
        ticketUnits: [],
        seatingType: 'Unnumbered',
        sellTogether: false,
      } as never);
      const mockUsersService = moduleRef.get(UsersService) as jest.Mocked<UsersService>;
      mockUsersService.findById
        .mockResolvedValueOnce({ id: buyerId, emailVerified: true } as never)
        .mockResolvedValueOnce({ id: sellerId } as never);
      termsService.hasAcceptedCurrentTerms.mockResolvedValue(false);

      await expect(
        service.initiatePurchase(
          mockCtx,
          buyerId,
          listingId,
          ['unit_1'],
          'payway',
          'snap_1',
          undefined,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(termsService.hasAcceptedCurrentTerms).toHaveBeenCalledWith(
        mockCtx,
        buyerId,
        'buyer',
      );
    });

    it('should throw BadRequestException when event date is expired', async () => {
      const listingId = 'listing_1';
      ticketsService.getListingById.mockResolvedValue({
        id: listingId,
        sellerId: 'seller_1',
        eventDateId: 'edt_expired',
        eventDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        pricePerTicket: { amount: 1000, currency: 'USD' },
        ticketUnits: [],
        seatingType: 'Unnumbered',
        sellTogether: false,
      } as never);
      (eventsService.assertEventDateNotExpired as jest.Mock).mockRejectedValueOnce(
        new BadRequestException('Event date is no longer available for purchase'),
      );

      await expect(
        service.initiatePurchase(
          mockCtx,
          'buyer_1',
          listingId,
          ['unit_1'],
          'payway',
          'snap_1',
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSellerCompletedSalesTotal', () => {
    it('should return the count from countCompletedBySellerId', async () => {
      transactionsRepository.countCompletedBySellerId.mockResolvedValue(5);

      const result = await service.getSellerCompletedSalesTotal(
        mockCtx,
        'seller_123',
      );

      expect(result).toBe(5);
      expect(
        transactionsRepository.countCompletedBySellerId,
      ).toHaveBeenCalledWith(mockCtx, 'seller_123');
    });

    it('should return 0 when seller has no completed transactions', async () => {
      transactionsRepository.countCompletedBySellerId.mockResolvedValue(0);

      const result = await service.getSellerCompletedSalesTotal(
        mockCtx,
        'seller_123',
      );

      expect(result).toBe(0);
    });
  });

  describe('getBuyerCompletedPurchasesTotal', () => {
    it('should return the count from countCompletedByBuyerId', async () => {
      transactionsRepository.countCompletedByBuyerId.mockResolvedValue(3);

      const result = await service.getBuyerCompletedPurchasesTotal(
        mockCtx,
        'buyer_123',
      );

      expect(result).toBe(3);
      expect(
        transactionsRepository.countCompletedByBuyerId,
      ).toHaveBeenCalledWith(mockCtx, 'buyer_123');
    });

    it('should return 0 when buyer has no completed transactions', async () => {
      transactionsRepository.countCompletedByBuyerId.mockResolvedValue(0);

      const result = await service.getBuyerCompletedPurchasesTotal(
        mockCtx,
        'buyer_123',
      );

      expect(result).toBe(0);
    });
  });

  describe('atomic transaction flows', () => {
    it('confirmReceipt transitions to DepositHold without releasing funds', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.DepositHold,
        version: 2,
      });

      await service.confirmReceipt(mockCtx, 'txn_123', 'buyer_123');

      expect(transactionsRepository.findByIdForUpdate).toHaveBeenCalled();
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
    });

    it('status transition uses optimistic locking', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        version: 5,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.TicketTransferred,
        version: 6,
      });
      ticketsService.getListingById.mockResolvedValue({
        id: 'listing_123',
        eventName: 'Test Event',
        eventDate: new Date(),
      } as never);

      await service.confirmTransfer(mockCtx, 'txn_123', 'seller_123');

      expect(transactionsRepository.updateWithVersion).toHaveBeenCalledWith(
        expect.anything(),
        'txn_123',
        expect.anything(),
        5,
      );
    });

    it('cancelTransaction restores tickets atomically', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      ticketsService.restoreTickets.mockResolvedValue(undefined);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        version: 2,
      });

      await service.cancelTransaction(
        mockCtx,
        'txn_123',
        RequiredActor.Buyer,
        CancellationReason.BuyerCancelled,
      );

      expect(txManager.executeInTransaction).toHaveBeenCalled();
      expect(ticketsService.restoreTickets).toHaveBeenCalled();
      expect(transactionsRepository.updateWithVersion).toHaveBeenCalled();
    });
  });

  describe('setBuyerDeliveryEmail', () => {
    const mockTxPaymentReceived = createMockTransaction({
      status: TransactionStatus.PaymentReceived,
      buyerDeliveryEmail: null,
    });

    it('sets email when buyer calls in PaymentReceived', async () => {
      transactionsRepository.findById.mockResolvedValue(mockTxPaymentReceived);
      transactionsRepository.update.mockResolvedValue({
        ...mockTxPaymentReceived,
        buyerDeliveryEmail: 'buyer@example.com',
      });
      jest.spyOn(service as any, 'enrichTransaction').mockResolvedValue({
        ...mockTxPaymentReceived,
        buyerDeliveryEmail: 'buyer@example.com',
        eventName: 'Event',
        eventDate: new Date(),
        venue: 'Venue',
        sectionName: 'General',
        buyerName: 'Buyer',
        sellerName: 'Seller',
        buyerPic: null,
        sellerPic: null,
      });

      const result = await service.setBuyerDeliveryEmail(
        mockCtx,
        mockTxPaymentReceived.id,
        mockTxPaymentReceived.buyerId,
        'buyer@example.com',
      );

      expect(transactionsRepository.update).toHaveBeenCalledWith(
        mockCtx,
        mockTxPaymentReceived.id,
        { buyerDeliveryEmail: 'buyer@example.com' },
      );
      expect(result.buyerDeliveryEmail).toBe('buyer@example.com');
    });

    it('throws ForbiddenException when caller is not the buyer', async () => {
      transactionsRepository.findById.mockResolvedValue(mockTxPaymentReceived);

      await expect(
        service.setBuyerDeliveryEmail(
          mockCtx,
          mockTxPaymentReceived.id,
          'other_user',
          'buyer@example.com',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when status is not PaymentReceived', async () => {
      const txWrongStatus = createMockTransaction({
        status: TransactionStatus.PendingPayment,
        buyerDeliveryEmail: null,
      });
      transactionsRepository.findById.mockResolvedValue(txWrongStatus);

      await expect(
        service.setBuyerDeliveryEmail(
          mockCtx,
          txWrongStatus.id,
          txWrongStatus.buyerId,
          'buyer@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when email already set', async () => {
      const txAlreadySet = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
        buyerDeliveryEmail: 'existing@example.com',
      });
      transactionsRepository.findById.mockResolvedValue(txAlreadySet);

      await expect(
        service.setBuyerDeliveryEmail(
          mockCtx,
          txAlreadySet.id,
          txAlreadySet.buyerId,
          'new@example.com',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when transaction not found', async () => {
      transactionsRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.setBuyerDeliveryEmail(mockCtx, 'nonexistent', 'buyer_123', 'buyer@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
