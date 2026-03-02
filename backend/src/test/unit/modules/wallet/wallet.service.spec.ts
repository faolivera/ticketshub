import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../../../../modules/wallet/wallet.service';
import { WALLET_REPOSITORY } from '../../../../modules/wallet/wallet.repository.interface';
import type { IWalletRepository } from '../../../../modules/wallet/wallet.repository.interface';
import { TransactionManager } from '../../../../common/database';
import { InsufficientFundsException } from '../../../../common/exceptions/insufficient-funds.exception';
import { OptimisticLockException } from '../../../../common/exceptions/optimistic-lock.exception';
import { WalletTransactionType } from '../../../../modules/wallet/wallet.domain';
import type { Wallet, WalletTransaction, Money } from '../../../../modules/wallet/wallet.domain';
import type { Ctx } from '../../../../common/types/context';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: jest.Mocked<IWalletRepository>;
  let txManager: jest.Mocked<TransactionManager>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const createMockWallet = (overrides: Partial<Wallet> = {}): Wallet => ({
    userId: 'user_123',
    balance: { amount: 10000, currency: 'EUR' },
    pendingBalance: { amount: 5000, currency: 'EUR' },
    version: 1,
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockMoney = (
    amount: number,
    currency: 'EUR' | 'USD' = 'EUR',
  ): Money => ({
    amount,
    currency,
  });

  const createMockWalletTransaction = (
    overrides: Partial<WalletTransaction> = {},
  ): WalletTransaction => ({
    id: 'wtx_123',
    walletUserId: 'user_123',
    type: WalletTransactionType.Credit,
    amount: { amount: 1000, currency: 'EUR' },
    reference: 'ref_123',
    description: 'Test transaction',
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockWalletRepository: jest.Mocked<IWalletRepository> = {
      getByUserId: jest.fn(),
      findByUserIdForUpdate: jest.fn(),
      upsertWallet: jest.fn(),
      updateBalances: jest.fn(),
      updateBalancesWithVersion: jest.fn(),
      createTransaction: jest.fn(),
      getTransactionsByUserId: jest.fn(),
      getTransactionById: jest.fn(),
    };

    const mockTxManager = {
      executeInTransaction: jest.fn().mockImplementation((_ctx, fn) => fn(_ctx)),
      getClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: WALLET_REPOSITORY, useValue: mockWalletRepository },
        { provide: TransactionManager, useValue: mockTxManager },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get(WALLET_REPOSITORY);
    txManager = module.get(TransactionManager);
  });

  describe('getOrCreateWallet', () => {
    it('should return existing wallet', async () => {
      const wallet = createMockWallet();
      walletRepository.getByUserId.mockResolvedValue(wallet);

      const result = await service.getOrCreateWallet(mockCtx, 'user_123');

      expect(result).toEqual(wallet);
      expect(walletRepository.upsertWallet).not.toHaveBeenCalled();
    });

    it('should create wallet if not exists', async () => {
      walletRepository.getByUserId.mockResolvedValue(undefined);
      const newWallet = createMockWallet({
        balance: { amount: 0, currency: 'EUR' },
        pendingBalance: { amount: 0, currency: 'EUR' },
      });
      walletRepository.upsertWallet.mockResolvedValue(newWallet);

      const result = await service.getOrCreateWallet(mockCtx, 'user_123');

      expect(walletRepository.upsertWallet).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          userId: 'user_123',
          balance: { amount: 0, currency: 'EUR' },
          pendingBalance: { amount: 0, currency: 'EUR' },
          version: 1,
        }),
      );
      expect(result.userId).toBe('user_123');
    });
  });

  describe('holdFunds', () => {
    it('should increment pending balance atomically', async () => {
      const wallet = createMockWallet({ pendingBalance: { amount: 0, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({ pendingBalance: { amount: 5000, currency: 'EUR' } }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Hold }),
      );

      const result = await service.holdFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Hold for sale',
      );

      expect(walletRepository.updateBalancesWithVersion).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
        0, // no balance change
        5000, // pending increase
        wallet.version,
      );
      expect(result.type).toBe(WalletTransactionType.Hold);
    });

    it('should create wallet if not exists', async () => {
      walletRepository.findByUserIdForUpdate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(
          createMockWallet({
            balance: { amount: 0, currency: 'EUR' },
            pendingBalance: { amount: 0, currency: 'EUR' },
          }),
        );
      walletRepository.upsertWallet.mockResolvedValue(
        createMockWallet({
          balance: { amount: 0, currency: 'EUR' },
          pendingBalance: { amount: 0, currency: 'EUR' },
        }),
      );
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({ pendingBalance: { amount: 5000, currency: 'EUR' } }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Hold }),
      );

      const result = await service.holdFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Hold for sale',
      );

      expect(walletRepository.upsertWallet).toHaveBeenCalled();
      expect(result.type).toBe(WalletTransactionType.Hold);
    });

    it('should create transaction record', async () => {
      const wallet = createMockWallet();
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(wallet);
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({
          type: WalletTransactionType.Hold,
          reference: 'ref_123',
          description: 'Hold for sale',
        }),
      );

      await service.holdFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Hold for sale',
      );

      expect(walletRepository.createTransaction).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          walletUserId: 'user_123',
          type: WalletTransactionType.Hold,
          amount: { amount: 5000, currency: 'EUR' },
          reference: 'ref_123',
          description: 'Hold for sale',
        }),
      );
    });
  });

  describe('releaseFunds', () => {
    it('should transfer pending to balance atomically', async () => {
      const wallet = createMockWallet({ pendingBalance: { amount: 5000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({
          balance: { amount: 15000, currency: 'EUR' },
          pendingBalance: { amount: 0, currency: 'EUR' },
        }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Release }),
      );

      const result = await service.releaseFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Release for completed sale',
      );

      expect(walletRepository.updateBalancesWithVersion).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
        5000, // balance increase
        -5000, // pending decrease
        wallet.version,
      );
      expect(result.type).toBe(WalletTransactionType.Release);
    });

    it('should throw BadRequestException when insufficient pending balance', async () => {
      const wallet = createMockWallet({ pendingBalance: { amount: 1000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);

      await expect(
        service.releaseFunds(
          mockCtx,
          'user_123',
          createMockMoney(5000),
          'ref_123',
          'Release for completed sale',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(walletRepository.updateBalancesWithVersion).not.toHaveBeenCalled();
    });
  });

  describe('debitFunds', () => {
    it('should throw InsufficientFundsException when overdraw attempted', async () => {
      const wallet = createMockWallet({ balance: { amount: 1000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);

      await expect(
        service.debitFunds(
          mockCtx,
          'user_123',
          createMockMoney(5000),
          'ref_123',
          'Withdrawal',
        ),
      ).rejects.toThrow(InsufficientFundsException);

      expect(walletRepository.updateBalancesWithVersion).not.toHaveBeenCalled();
    });

    it('should succeed with sufficient balance', async () => {
      const wallet = createMockWallet({ balance: { amount: 10000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({ balance: { amount: 5000, currency: 'EUR' } }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Debit }),
      );

      const result = await service.debitFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Withdrawal',
      );

      expect(walletRepository.updateBalancesWithVersion).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
        -5000, // balance decrease
        0, // no pending change
        wallet.version,
      );
      expect(result.type).toBe(WalletTransactionType.Debit);
    });

    it('should succeed when balance equals requested amount', async () => {
      const wallet = createMockWallet({ balance: { amount: 5000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({ balance: { amount: 0, currency: 'EUR' } }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Debit }),
      );

      const result = await service.debitFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Withdrawal',
      );

      expect(result.type).toBe(WalletTransactionType.Debit);
    });
  });

  describe('creditFunds', () => {
    it('should increment balance atomically', async () => {
      const wallet = createMockWallet({ balance: { amount: 10000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({ balance: { amount: 15000, currency: 'EUR' } }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Credit }),
      );

      const result = await service.creditFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Bonus credit',
      );

      expect(walletRepository.updateBalancesWithVersion).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
        5000, // balance increase
        0, // no pending change
        wallet.version,
      );
      expect(result.type).toBe(WalletTransactionType.Credit);
    });

    it('should create wallet if not exists', async () => {
      walletRepository.findByUserIdForUpdate
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(
          createMockWallet({
            balance: { amount: 0, currency: 'EUR' },
            pendingBalance: { amount: 0, currency: 'EUR' },
          }),
        );
      walletRepository.upsertWallet.mockResolvedValue(
        createMockWallet({
          balance: { amount: 0, currency: 'EUR' },
          pendingBalance: { amount: 0, currency: 'EUR' },
        }),
      );
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({ balance: { amount: 5000, currency: 'EUR' } }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Credit }),
      );

      const result = await service.creditFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Bonus credit',
      );

      expect(walletRepository.upsertWallet).toHaveBeenCalled();
      expect(result.type).toBe(WalletTransactionType.Credit);
    });
  });

  describe('refundHeldFunds', () => {
    it('should decrement pending balance', async () => {
      const wallet = createMockWallet({ pendingBalance: { amount: 5000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({ pendingBalance: { amount: 0, currency: 'EUR' } }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Debit }),
      );

      const result = await service.refundHeldFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Transaction cancelled',
      );

      expect(walletRepository.updateBalancesWithVersion).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
        0, // no balance change
        -5000, // pending decrease
        wallet.version,
      );
      expect(result.type).toBe(WalletTransactionType.Debit);
    });

    it('should not go below zero on pending balance', async () => {
      const wallet = createMockWallet({ pendingBalance: { amount: 3000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(
        createMockWallet({ pendingBalance: { amount: 0, currency: 'EUR' } }),
      );
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({
          type: WalletTransactionType.Debit,
          amount: { amount: 3000, currency: 'EUR' },
        }),
      );

      await service.refundHeldFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000), // Requesting more than available
        'ref_123',
        'Transaction cancelled',
      );

      // Should only refund the available amount (3000, not 5000)
      expect(walletRepository.updateBalancesWithVersion).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
        0,
        -3000, // Only the available amount
        wallet.version,
      );
    });
  });

  describe('optimistic lock handling', () => {
    it('should propagate OptimisticLockException on version mismatch', async () => {
      const wallet = createMockWallet();
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockRejectedValue(
        new OptimisticLockException('Wallet', 'user_123'),
      );

      await expect(
        service.creditFunds(
          mockCtx,
          'user_123',
          createMockMoney(5000),
          'ref_123',
          'Bonus credit',
        ),
      ).rejects.toThrow(OptimisticLockException);
    });
  });

  describe('transaction records', () => {
    it('should create transaction record for holdFunds', async () => {
      const wallet = createMockWallet();
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(wallet);
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Hold }),
      );

      await service.holdFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Hold description',
      );

      expect(walletRepository.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should create transaction record for releaseFunds', async () => {
      const wallet = createMockWallet({ pendingBalance: { amount: 10000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(wallet);
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Release }),
      );

      await service.releaseFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Release description',
      );

      expect(walletRepository.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should create transaction record for debitFunds', async () => {
      const wallet = createMockWallet({ balance: { amount: 10000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(wallet);
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Debit }),
      );

      await service.debitFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Debit description',
      );

      expect(walletRepository.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should create transaction record for creditFunds', async () => {
      const wallet = createMockWallet();
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(wallet);
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Credit }),
      );

      await service.creditFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Credit description',
      );

      expect(walletRepository.createTransaction).toHaveBeenCalledTimes(1);
    });

    it('should create transaction record for refundHeldFunds', async () => {
      const wallet = createMockWallet({ pendingBalance: { amount: 10000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(wallet);
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Debit }),
      );

      await service.refundHeldFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Refund description',
      );

      expect(walletRepository.createTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTransactions', () => {
    it('should return transaction history', async () => {
      const transactions = [
        createMockWalletTransaction({ id: 'wtx_1', type: WalletTransactionType.Credit }),
        createMockWalletTransaction({ id: 'wtx_2', type: WalletTransactionType.Debit }),
      ];
      walletRepository.getTransactionsByUserId.mockResolvedValue(transactions);

      const result = await service.getTransactions(mockCtx, 'user_123');

      expect(result).toEqual(transactions);
      expect(walletRepository.getTransactionsByUserId).toHaveBeenCalledWith(
        mockCtx,
        'user_123',
      );
    });

    it('should return empty array when no transactions', async () => {
      walletRepository.getTransactionsByUserId.mockResolvedValue([]);

      const result = await service.getTransactions(mockCtx, 'user_123');

      expect(result).toEqual([]);
    });
  });

  describe('transaction context', () => {
    it('should execute holdFunds within transaction', async () => {
      const wallet = createMockWallet();
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(wallet);
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Hold }),
      );

      await service.holdFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Hold',
      );

      expect(txManager.executeInTransaction).toHaveBeenCalledWith(
        mockCtx,
        expect.any(Function),
      );
    });

    it('should execute debitFunds within transaction', async () => {
      const wallet = createMockWallet({ balance: { amount: 10000, currency: 'EUR' } });
      walletRepository.findByUserIdForUpdate.mockResolvedValue(wallet);
      walletRepository.updateBalancesWithVersion.mockResolvedValue(wallet);
      walletRepository.createTransaction.mockResolvedValue(
        createMockWalletTransaction({ type: WalletTransactionType.Debit }),
      );

      await service.debitFunds(
        mockCtx,
        'user_123',
        createMockMoney(5000),
        'ref_123',
        'Debit',
      );

      expect(txManager.executeInTransaction).toHaveBeenCalledWith(
        mockCtx,
        expect.any(Function),
      );
    });
  });
});
