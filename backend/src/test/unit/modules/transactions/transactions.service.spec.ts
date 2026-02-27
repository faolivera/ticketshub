import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../../../../modules/transactions/transactions.service';
import { TransactionsRepository } from '../../../../modules/transactions/transactions.repository';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { PaymentsService } from '../../../../modules/payments/payments.service';
import { WalletService } from '../../../../modules/wallet/wallet.service';
import { ConfigService } from '../../../../modules/config/config.service';
import { UsersService } from '../../../../modules/users/users.service';
import { PaymentMethodsService } from '../../../../modules/payments/payment-methods.service';
import { PricingService } from '../../../../modules/payments/pricing/pricing.service';
import {
  TransactionStatus,
  RequiredActor,
  CancellationReason,
  STATUS_REQUIRED_ACTOR,
} from '../../../../modules/transactions/transactions.domain';
import { TicketType } from '../../../../modules/tickets/tickets.domain';
import type { Transaction } from '../../../../modules/transactions/transactions.domain';
import type { Ctx } from '../../../../common/types/context';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionsRepository: jest.Mocked<TransactionsRepository>;
  let ticketsService: jest.Mocked<TicketsService>;
  let walletService: jest.Mocked<WalletService>;

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
    ...overrides,
  });

  beforeEach(async () => {
    const mockTransactionsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      getAll: jest.fn(),
      getByBuyerId: jest.fn(),
      getBySellerId: jest.fn(),
      getByListingId: jest.fn(),
      getByListingIds: jest.fn(),
      getPendingAutoRelease: jest.fn(),
      findExpiredPendingPayments: jest.fn(),
      findExpiredAdminReviews: jest.fn(),
      getPaginated: jest.fn(),
      countByStatuses: jest.fn(),
      getIdsByStatuses: jest.fn(),
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

    const mockConfigService = {
      getPaymentTimeoutMinutes: jest.fn().mockReturnValue(10),
      getAdminReviewTimeoutHours: jest.fn().mockReturnValue(24),
      getDigitalNonTransferableReleaseMinutes: jest.fn().mockReturnValue(30),
    };

    const mockUsersService = {
      getPublicUserInfoByIds: jest.fn(),
    };

    const mockPaymentMethodsService = {
      findAll: jest.fn(),
    };

    const mockPricingService = {
      validateAndConsume: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: mockTransactionsRepository },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: PricingService, useValue: mockPricingService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionsRepository = module.get(TransactionsRepository);
    ticketsService = module.get(TicketsService);
    walletService = module.get(WalletService);
  });

  describe('cancelTransaction', () => {
    it('should cancel a PendingPayment transaction and restore tickets', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findById.mockResolvedValue(transaction);
      transactionsRepository.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        requiredActor: STATUS_REQUIRED_ACTOR[TransactionStatus.Cancelled],
        cancelledAt: expect.any(Date),
        cancelledBy: RequiredActor.Buyer,
        cancellationReason: CancellationReason.BuyerCancelled,
      });
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.cancelTransaction(
        mockCtx,
        'txn_123',
        RequiredActor.Buyer,
        CancellationReason.BuyerCancelled,
      );

      expect(result.status).toBe(TransactionStatus.Cancelled);
      expect(ticketsService.restoreTickets).toHaveBeenCalledWith(
        mockCtx,
        'listing_123',
        ['unit_1', 'unit_2'],
      );
      expect(transactionsRepository.update).toHaveBeenCalledWith(
        mockCtx,
        'txn_123',
        expect.objectContaining({
          status: TransactionStatus.Cancelled,
          cancelledBy: RequiredActor.Buyer,
          cancellationReason: CancellationReason.BuyerCancelled,
        }),
      );
    });

    it('should cancel a PaymentPendingVerification transaction', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentPendingVerification,
        requiredActor: RequiredActor.Platform,
      });
      transactionsRepository.findById.mockResolvedValue(transaction);
      transactionsRepository.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        requiredActor: STATUS_REQUIRED_ACTOR[TransactionStatus.Cancelled],
        cancelledBy: RequiredActor.Platform,
        cancellationReason: CancellationReason.AdminRejected,
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
      transactionsRepository.findById.mockResolvedValue(undefined);

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
      transactionsRepository.findById.mockResolvedValue(transaction);

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
      transactionsRepository.findById.mockResolvedValue(transaction);

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
      transactionsRepository.findById.mockResolvedValue(transaction);

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
      transactionsRepository.findById.mockImplementation(async (_ctx, id) =>
        expiredTransactions.find((t) => t.id === id),
      );
      transactionsRepository.update.mockImplementation(async (_ctx, id) => ({
        ...expiredTransactions.find((t) => t.id === id)!,
        status: TransactionStatus.Cancelled,
        requiredActor: RequiredActor.None,
        cancelledBy: RequiredActor.Platform,
        cancellationReason: CancellationReason.PaymentTimeout,
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
      transactionsRepository.findById.mockImplementation(async (_ctx, id) => {
        if (id === 'txn_2') return undefined;
        return expiredTransactions.find((t) => t.id === id);
      });
      transactionsRepository.update.mockImplementation(async (_ctx, id) => ({
        ...expiredTransactions.find((t) => t.id === id)!,
        status: TransactionStatus.Cancelled,
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
      transactionsRepository.findById.mockResolvedValue(expiredTransactions[0]);
      transactionsRepository.update.mockResolvedValue({
        ...expiredTransactions[0],
        status: TransactionStatus.Cancelled,
        requiredActor: RequiredActor.None,
        cancelledBy: RequiredActor.Platform,
        cancellationReason: CancellationReason.AdminReviewTimeout,
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
      transactionsRepository.findById.mockResolvedValue(transaction);
      transactionsRepository.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.Cancelled,
        requiredActor: RequiredActor.None,
        cancelledBy: RequiredActor.Platform,
        cancellationReason: CancellationReason.PaymentFailed,
      });
      ticketsService.restoreTickets.mockResolvedValue(undefined);

      const result = await service.handlePaymentFailed(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.Cancelled);
      expect(result.cancellationReason).toBe(CancellationReason.PaymentFailed);
      expect(result.cancelledBy).toBe(RequiredActor.Platform);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.handlePaymentFailed(mockCtx, 'invalid_id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction is not PendingPayment', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.handlePaymentFailed(mockCtx, 'txn_123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handlePaymentConfirmationUploaded', () => {
    it('should transition to PaymentPendingVerification status', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findById.mockResolvedValue(transaction);
      transactionsRepository.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.PaymentPendingVerification,
        requiredActor: RequiredActor.Platform,
        adminReviewExpiresAt: expect.any(Date),
      });

      const result = await service.handlePaymentConfirmationUploaded(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.PaymentPendingVerification);
      expect(transactionsRepository.update).toHaveBeenCalledWith(
        mockCtx,
        'txn_123',
        expect.objectContaining({
          status: TransactionStatus.PaymentPendingVerification,
          requiredActor: RequiredActor.Platform,
        }),
      );
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.handlePaymentConfirmationUploaded(mockCtx, 'invalid_id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction is not PendingPayment', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.handlePaymentConfirmationUploaded(mockCtx, 'txn_123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handlePaymentReceived', () => {
    it('should hold funds and transition to PaymentReceived status', async () => {
      const transaction = createMockTransaction();
      transactionsRepository.findById.mockResolvedValue(transaction);
      walletService.holdFunds.mockResolvedValue(undefined);
      transactionsRepository.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.PaymentReceived,
        requiredActor: RequiredActor.Seller,
        paymentReceivedAt: expect.any(Date),
      });

      const result = await service.handlePaymentReceived(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.PaymentReceived);
      expect(walletService.holdFunds).toHaveBeenCalledWith(
        mockCtx,
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
      transactionsRepository.findById.mockResolvedValue(transaction);
      walletService.holdFunds.mockResolvedValue(undefined);
      transactionsRepository.update.mockResolvedValue({
        ...transaction,
        status: TransactionStatus.PaymentReceived,
      });

      const result = await service.handlePaymentReceived(mockCtx, 'txn_123');

      expect(result.status).toBe(TransactionStatus.PaymentReceived);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.handlePaymentReceived(mockCtx, 'invalid_id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction status is invalid', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsRepository.findById.mockResolvedValue(transaction);

      await expect(
        service.handlePaymentReceived(mockCtx, 'txn_123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processAutoReleases', () => {
    it('should release funds for pending auto-release transactions', async () => {
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
      walletService.releaseFunds.mockResolvedValue(undefined);
      transactionsRepository.update.mockResolvedValue({
        ...pendingReleases[0],
        status: TransactionStatus.Completed,
      });

      const result = await service.processAutoReleases(mockCtx);

      expect(result).toBe(2);
      expect(walletService.releaseFunds).toHaveBeenCalledTimes(2);
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
      walletService.releaseFunds
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Wallet error'));
      transactionsRepository.update.mockResolvedValue({
        ...pendingReleases[0],
        status: TransactionStatus.Completed,
      });

      const result = await service.processAutoReleases(mockCtx);

      expect(result).toBe(1);
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

      expect(result).toBeUndefined();
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
});
