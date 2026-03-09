import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentConfirmationsService } from '../../../../src/modules/payment-confirmations/payment-confirmations.service';
import { PAYMENT_CONFIRMATIONS_REPOSITORY } from '../../../../src/modules/payment-confirmations/payment-confirmations.repository.interface';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { NotificationsService } from '../../../../src/modules/notifications/notifications.service';
import { PRIVATE_STORAGE_PROVIDER } from '../../../../src/common/storage/file-storage-provider.interface';
import { TransactionStatus } from '../../../../src/modules/transactions/transactions.domain';
import { TicketType } from '../../../../src/modules/tickets/tickets.domain';
import type { Transaction } from '../../../../src/modules/transactions/transactions.domain';
import type { Ctx } from '../../../../src/common/types/context';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

const createMockTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction =>
  ({
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketType: TicketType.Digital,
    ticketUnitIds: ['unit_1'],
    quantity: 1,
    ticketPrice: { amount: 10000, currency: 'USD' },
    buyerPlatformFee: { amount: 500, currency: 'USD' },
    sellerPlatformFee: { amount: 200, currency: 'USD' },
    paymentMethodCommission: { amount: 0, currency: 'USD' },
    totalPaid: { amount: 10700, currency: 'USD' },
    sellerReceives: { amount: 10000, currency: 'USD' },
    pricingSnapshotId: 'ps_123',
    status: TransactionStatus.PendingPayment,
    createdAt: new Date(),
    paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  }) as Transaction;

const validFile = {
  buffer: Buffer.from('fake'),
  originalname: 'receipt.png',
  mimetype: 'image/png' as const,
  size: 1024,
};

describe('PaymentConfirmationsService', () => {
  let service: PaymentConfirmationsService;
  let transactionsService: jest.Mocked<TransactionsService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;
  let repository: {
    findByTransactionId: jest.Mock;
    save: jest.Mock;
    findById: jest.Mock;
    findByIds: jest.Mock;
    findAllPending: jest.Mock;
    countPending: jest.Mock;
    getPendingTransactionIds: jest.Mock;
    findByTransactionIds: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findByTransactionId: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findAllPending: jest.fn(),
      countPending: jest.fn(),
      getPendingTransactionIds: jest.fn(),
      findByTransactionIds: jest.fn(),
      delete: jest.fn(),
    };

    const mockTransactionsService = {
      findById: jest.fn(),
      handlePaymentConfirmationUploaded: jest.fn(),
      approveManualPayment: jest.fn(),
    };

    const mockPaymentMethodsService = {
      findById: jest.fn(),
    };

    const mockUsersService = { findById: jest.fn() };
    const mockTicketsService = { getListingById: jest.fn() };
    const mockStorageProvider = { store: jest.fn(), retrieve: jest.fn() };
    const mockNotificationsService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentConfirmationsService,
        { provide: PAYMENT_CONFIRMATIONS_REPOSITORY, useValue: repository },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: PRIVATE_STORAGE_PROVIDER, useValue: mockStorageProvider },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get(PaymentConfirmationsService);
    transactionsService = module.get(TransactionsService);
    paymentMethodsService = module.get(PaymentMethodsService);
  });

  describe('uploadConfirmation', () => {
    it('should throw BadRequest when transaction has no paymentMethodId', async () => {
      const txn = createMockTransaction({ paymentMethodId: undefined });
      transactionsService.findById.mockResolvedValue(txn);

      await expect(
        service.uploadConfirmation(mockCtx, 'txn_123', 'buyer_123', validFile),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.uploadConfirmation(mockCtx, 'txn_123', 'buyer_123', validFile),
      ).rejects.toThrow(
        'Payment confirmation is only required for manual payment methods',
      );

      expect(paymentMethodsService.findById).not.toHaveBeenCalled();
    });

    it('should throw BadRequest when payment method is not manual_approval', async () => {
      const txn = createMockTransaction({ paymentMethodId: 'pm_payway' });
      transactionsService.findById.mockResolvedValue(txn);
      paymentMethodsService.findById.mockResolvedValue({
        id: 'pm_payway',
        type: 'payment_gateway',
        name: 'Payway',
        publicName: 'Payway',
        status: 'enabled',
        buyerCommissionPercent: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.uploadConfirmation(mockCtx, 'txn_123', 'buyer_123', validFile),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.uploadConfirmation(mockCtx, 'txn_123', 'buyer_123', validFile),
      ).rejects.toThrow(
        'Payment confirmation is only required for manual payment methods',
      );

      expect(paymentMethodsService.findById).toHaveBeenCalledWith(
        mockCtx,
        'pm_payway',
      );
    });

    it('should pass manual check when payment method is manual_approval (any id, e.g. bank transfer)', async () => {
      const txn = createMockTransaction({ paymentMethodId: 'pm_galicia' });
      transactionsService.findById.mockResolvedValue(txn);
      paymentMethodsService.findById.mockResolvedValue({
        id: 'pm_galicia',
        type: 'manual_approval',
        name: 'Bank Transfer Galicia',
        publicName: 'Bank Transfer',
        status: 'enabled',
        buyerCommissionPercent: 0,
        bankTransferConfig: {
          cbu: '123',
          accountHolderName: 'Acme',
          bankName: 'Galicia',
          cuitCuil: '20-12345678-9',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // Next step after manual check is existing confirmation; return existing so we fail there (proves we passed manual check)
      repository.findByTransactionId.mockResolvedValue({
        id: 'pc_1',
        transactionId: 'txn_123',
      });

      await expect(
        service.uploadConfirmation(mockCtx, 'txn_123', 'buyer_123', validFile),
      ).rejects.toThrow('Payment confirmation already uploaded');

      expect(paymentMethodsService.findById).toHaveBeenCalledWith(
        mockCtx,
        'pm_galicia',
      );
    });
  });
});
