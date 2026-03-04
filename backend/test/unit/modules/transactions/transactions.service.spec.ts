import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
import { OptimisticLockException } from '../../../../src/common/exceptions/optimistic-lock.exception';
import {
  TransactionStatus,
  RequiredActor,
  CancellationReason,
  STATUS_REQUIRED_ACTOR,
} from '../../../../src/modules/transactions/transactions.domain';
import { TicketType } from '../../../../src/modules/tickets/tickets.domain';
import type { Transaction } from '../../../../src/modules/transactions/transactions.domain';
import type { Ctx } from '../../../../src/common/types/context';
import type { TxCtx } from '../../../../src/common/database/types';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepository: jest.Mocked<ITransactionsRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let walletService: jest.Mocked<WalletService>;
  let txManager: jest.Mocked<TransactionManager>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketType: TicketType.DigitalTransferable,
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
    ...overrides,
  });

  beforeEach(async () => {
    const mockTransactionsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      update: jest.fn(),
      updateWithVersion: jest.fn(),
      getAll: jest.fn(),
      getByBuyerId: jest.fn(),
      getBySellerId: jest.fn(),
      getByListingId: jest.fn(),
      getByListingIds: jest.fn(),
      getPendingAutoRelease: jest.fn(),
      getPendingDepositRelease: jest.fn(),
      findExpiredPendingPayments: jest.fn(),
      findExpiredAdminReviews: jest.fn(),
      getPaginated: jest.fn(),
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
      }),
    };

    const mockUsersService = {
      findById: jest.fn(),
      getPublicUserInfoByIds: jest.fn(),
    };

    const mockPaymentMethodsService = {
      findAll: jest.fn(),
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

    const mockTxManager = {
      executeInTransaction: jest.fn().mockImplementation(
        async (_ctx: Ctx, fn: (txCtx: TxCtx) => Promise<unknown>) => {
          const txCtx = { ..._ctx, tx: {} } as TxCtx;
          return fn(txCtx);
        },
      ),
      getClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TRANSACTIONS_REPOSITORY, useValue: mockTransactionsRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: PlatformConfigService, useValue: mockPlatformConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: PricingService, useValue: mockPricingService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: OffersService, useValue: mockOffersService },
        { provide: TransactionManager, useValue: mockTxManager },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionsRepository = module.get(TRANSACTIONS_REPOSITORY);
    ticketsService = module.get(TicketsService);
    walletService = module.get(WalletService);
    txManager = module.get(TransactionManager);
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

      transactionsRepository.findExpiredPendingPayments.mockResolvedValue(expiredTransactions);
      transactionsRepository.findByIdForUpdate.mockImplementation(async (_ctx, id) =>
        expiredTransactions.find((t) => t.id === id),
      );
      transactionsRepository.updateWithVersion.mockImplementation(async (_ctx, id) => ({
        ...expiredTransactions.find((t) => t.id === id)!,
        status: TransactionStatus.Cancelled,
        requiredActor: RequiredActor.None,
        cancelledBy: RequiredActor.Platform,
        cancellationReason: CancellationReason.PaymentTimeout,
        version: 2,
      }));
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelExpiredPendingPayments(mockCtx);

      expect(result).toBe(2);
      expect(ticketsService.restoreTickets).toHaveBeenCalledTimes(2);
      expect(transactionsRepository.findExpiredPendingPayments).toHaveBeenCalledWith(mockCtx);
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

      transactionsRepository.findExpiredPendingPayments.mockResolvedValue(expiredTransactions);
      transactionsRepository.findByIdForUpdate.mockImplementation(async (_ctx, id) => {
        if (id === 'txn_2') return undefined;
        return expiredTransactions.find((t) => t.id === id);
      });
      transactionsRepository.updateWithVersion.mockImplementation(async (_ctx, id) => ({
        ...expiredTransactions.find((t) => t.id === id)!,
        status: TransactionStatus.Cancelled,
        version: 2,
      }));
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

      transactionsRepository.findExpiredAdminReviews.mockResolvedValue(expiredTransactions);
      transactionsRepository.findByIdForUpdate.mockResolvedValue(expiredTransactions[0]);
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
      expect(transactionsRepository.findExpiredAdminReviews).toHaveBeenCalledWith(mockCtx);
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

      const result = await service.handlePaymentConfirmationUploaded(mockCtx, 'txn_123');

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

  describe('processAutoReleases', () => {
    it('should release funds for pending auto-release transactions atomically', async () => {
      const pendingReleases = [
        createMockTransaction({
          id: 'txn_1',
          status: TransactionStatus.TicketTransferred,
          autoReleaseAt: new Date(Date.now() - 1000),
        }),
        createMockTransaction({
          id: 'txn_2',
          status: TransactionStatus.TicketTransferred,
          autoReleaseAt: new Date(Date.now() - 1000),
        }),
      ];

      transactionsRepository.getPendingAutoRelease.mockResolvedValue(pendingReleases);
      transactionsRepository.findByIdForUpdate.mockImplementation(async (_ctx, id) =>
        pendingReleases.find((t) => t.id === id),
      );
      walletService.releaseFunds.mockResolvedValue(undefined);
      transactionsRepository.updateWithVersion.mockImplementation(async (_ctx, id) => ({
        ...pendingReleases.find((t) => t.id === id)!,
        status: TransactionStatus.Completed,
        version: 2,
      }));

      const result = await service.processAutoReleases(mockCtx);

      expect(result).toBe(2);
      expect(walletService.releaseFunds).toHaveBeenCalledTimes(2);
      expect(txManager.executeInTransaction).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no pending auto-releases', async () => {
      transactionsRepository.getPendingAutoRelease.mockResolvedValue([]);

      const result = await service.processAutoReleases(mockCtx);

      expect(result).toBe(0);
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
    });

    it('should continue processing when one release fails', async () => {
      const pendingReleases = [
        createMockTransaction({
          id: 'txn_1',
          status: TransactionStatus.TicketTransferred,
        }),
        createMockTransaction({
          id: 'txn_2',
          status: TransactionStatus.TicketTransferred,
        }),
      ];

      transactionsRepository.getPendingAutoRelease.mockResolvedValue(pendingReleases);
      transactionsRepository.findByIdForUpdate.mockImplementation(async (_ctx, id) =>
        pendingReleases.find((t) => t.id === id),
      );
      walletService.releaseFunds
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Wallet error'));
      transactionsRepository.updateWithVersion.mockImplementation(async (_ctx, id) => ({
        ...pendingReleases.find((t) => t.id === id)!,
        status: TransactionStatus.Completed,
        version: 2,
      }));

      const result = await service.processAutoReleases(mockCtx);

      expect(result).toBe(1);
    });

    it('should skip already processed transactions (status changed)', async () => {
      const pendingReleases = [
        createMockTransaction({
          id: 'txn_1',
          status: TransactionStatus.TicketTransferred,
        }),
      ];

      transactionsRepository.getPendingAutoRelease.mockResolvedValue(pendingReleases);
      transactionsRepository.findByIdForUpdate.mockResolvedValue({
        ...pendingReleases[0],
        status: TransactionStatus.Completed,
      });

      const result = await service.processAutoReleases(mockCtx);

      expect(result).toBe(1);
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
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

  describe('hasCompletedTransactionsForListings', () => {
    it('should return true when completed transactions exist', async () => {
      const transactions = [
        createMockTransaction({ status: TransactionStatus.Completed }),
      ];
      transactionsRepository.getByListingIds.mockResolvedValue(transactions);

      const result = await service.hasCompletedTransactionsForListings(mockCtx, ['listing_123']);

      expect(result).toBe(true);
    });

    it('should return false when no completed transactions exist', async () => {
      const transactions = [
        createMockTransaction({ status: TransactionStatus.PendingPayment }),
      ];
      transactionsRepository.getByListingIds.mockResolvedValue(transactions);

      const result = await service.hasCompletedTransactionsForListings(mockCtx, ['listing_123']);

      expect(result).toBe(false);
    });

    it('should return false for empty listing IDs array', async () => {
      const result = await service.hasCompletedTransactionsForListings(mockCtx, []);

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

      const result = await service.confirmReceipt(mockCtx, 'txn_123', 'buyer_123');

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
  });

  describe('processDepositReleases', () => {
    it('should transition TicketTransferred to TransferringFund when depositReleaseAt passed', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
        depositReleaseAt: new Date(Date.now() - 1000),
      });
      transactionsRepository.getPendingDepositRelease.mockResolvedValue([transaction]);
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
      transactionsRepository.updateWithVersion.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.TransferringFund,
        requiredActor: RequiredActor.Platform,
        version: 2,
      });

      const count = await service.processDepositReleases(mockCtx);

      expect(count).toBe(1);
      expect(transactionsRepository.getPendingDepositRelease).toHaveBeenCalledWith(mockCtx);
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
  });

  describe('completePayout', () => {
    it('should release funds and set Completed when status is TransferringFund', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TransferringFund,
        requiredActor: RequiredActor.Platform,
      });
      transactionsRepository.findByIdForUpdate.mockResolvedValue(transaction);
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

      await expect(service.completePayout(mockCtx, 'invalid_id')).rejects.toThrow(
        NotFoundException,
      );
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

      const result = await service.confirmTransfer(mockCtx, 'txn_123', 'seller_123');

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
});
