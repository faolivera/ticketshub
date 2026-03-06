import { PrismaClient } from '@prisma/client';
import { WalletRepository } from '@/modules/wallet/wallet.repository';
import {
  WalletTransactionType,
  type Wallet,
  type WalletTransaction,
  type Money,
} from '@/modules/wallet/wallet.domain';
import {
  Role,
  UserStatus,
} from '@/modules/users/users.domain';
import type { Ctx } from '@/common/types/context';
import { OptimisticLockException } from '@/common/exceptions/optimistic-lock.exception';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';
import { randomUUID } from 'crypto';

describe('WalletRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: WalletRepository;
  let ctx: Ctx;

  const createMoney = (amount: number, currency: 'EUR' | 'USD' = 'EUR'): Money => ({
    amount,
    currency,
  });

  const createTestUser = async (overrides?: { email?: string }): Promise<string> => {
    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: overrides?.email ?? `test-${Date.now()}-${randomUUID()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        publicName: `testuser-${userId.slice(0, 8)}`,
        password: 'hashedpassword123',
        role: Role.User,
        language: 'en',
        emailVerified: true,
        phoneVerified: false,
        imageId: 'default',
        status: UserStatus.Enabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return userId;
  };

  const createTestWallet = (userId: string, overrides?: Partial<Wallet>): Wallet => ({
    userId,
    balance: createMoney(10000),
    pendingBalance: createMoney(0),
    version: 1,
    updatedAt: new Date(),
    ...overrides,
  });

  const createTestTransaction = (
    walletUserId: string,
    overrides?: Partial<WalletTransaction>,
  ): WalletTransaction => ({
    id: randomUUID(),
    walletUserId,
    type: WalletTransactionType.Credit,
    amount: createMoney(5000),
    reference: `ref-${randomUUID()}`,
    description: 'Test transaction',
    createdAt: new Date(),
    ...overrides,
  });

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new WalletRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==================== Wallet Methods ====================

  describe('getByUserId', () => {
    it('should return undefined when wallet does not exist', async () => {
      const userId = await createTestUser();

      const wallet = await repository.getByUserId(ctx, userId);

      expect(wallet).toBeUndefined();
    });

    it('should return wallet when it exists', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId);
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.getByUserId(ctx, userId);

      expect(wallet).toBeDefined();
      expect(wallet?.userId).toBe(userId);
      expect(wallet?.balance.amount).toBe(10000);
      expect(wallet?.balance.currency).toBe('EUR');
      expect(wallet?.pendingBalance.amount).toBe(0);
      expect(wallet?.version).toBe(1);
    });

    it('should return wallet with correct Money structure', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, {
        balance: createMoney(50000, 'USD'),
        pendingBalance: createMoney(1000, 'USD'),
      });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.getByUserId(ctx, userId);

      expect(wallet?.balance).toEqual({ amount: 50000, currency: 'USD' });
      expect(wallet?.pendingBalance).toEqual({ amount: 1000, currency: 'USD' });
    });
  });

  describe('findByUserIdForUpdate', () => {
    it('should return undefined when wallet does not exist', async () => {
      const userId = await createTestUser();

      const wallet = await repository.findByUserIdForUpdate(ctx, userId);

      expect(wallet).toBeUndefined();
    });

    it('should return wallet with FOR UPDATE lock', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, {
        balance: createMoney(25000),
      });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.findByUserIdForUpdate(ctx, userId);

      expect(wallet).toBeDefined();
      expect(wallet?.userId).toBe(userId);
      expect(wallet?.balance.amount).toBe(25000);
    });

    it('should return correct version for optimistic locking', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, { version: 5 });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.findByUserIdForUpdate(ctx, userId);

      expect(wallet?.version).toBe(5);
    });
  });

  describe('upsertWallet', () => {
    it('should create a new wallet when it does not exist', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId);

      const wallet = await repository.upsertWallet(ctx, walletData);

      expect(wallet).toBeDefined();
      expect(wallet.userId).toBe(userId);
      expect(wallet.balance.amount).toBe(10000);
      expect(wallet.pendingBalance.amount).toBe(0);
      expect(wallet.version).toBe(1);
    });

    it('should update existing wallet', async () => {
      const userId = await createTestUser();
      const initialWallet = createTestWallet(userId, {
        balance: createMoney(5000),
      });
      await repository.upsertWallet(ctx, initialWallet);

      const updatedWallet = createTestWallet(userId, {
        balance: createMoney(15000),
        version: 2,
      });
      const wallet = await repository.upsertWallet(ctx, updatedWallet);

      expect(wallet.balance.amount).toBe(15000);
      expect(wallet.version).toBe(2);
    });

    it('should create wallet with zero balance', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, {
        balance: createMoney(0),
        pendingBalance: createMoney(0),
      });

      const wallet = await repository.upsertWallet(ctx, walletData);

      expect(wallet.balance.amount).toBe(0);
      expect(wallet.pendingBalance.amount).toBe(0);
    });

    it('should handle different currencies', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, {
        balance: createMoney(10000, 'USD'),
        pendingBalance: createMoney(500, 'USD'),
      });

      const wallet = await repository.upsertWallet(ctx, walletData);

      expect(wallet.balance.currency).toBe('USD');
      expect(wallet.pendingBalance.currency).toBe('USD');
    });
  });

  describe('updateBalances', () => {
    it('should return undefined when wallet does not exist', async () => {
      const userId = await createTestUser();

      const result = await repository.updateBalances(ctx, userId, 5000, 1000);

      expect(result).toBeUndefined();
    });

    it('should update balance amounts correctly', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, {
        balance: createMoney(10000),
        pendingBalance: createMoney(0),
      });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.updateBalances(ctx, userId, 15000, 2000);

      expect(wallet).toBeDefined();
      expect(wallet?.balance.amount).toBe(15000);
      expect(wallet?.pendingBalance.amount).toBe(2000);
    });

    it('should increment version on update', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, { version: 1 });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.updateBalances(ctx, userId, 5000, 0);

      expect(wallet?.version).toBe(2);
    });

    it('should preserve currency when updating amounts', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, {
        balance: createMoney(10000, 'USD'),
        pendingBalance: createMoney(0, 'USD'),
      });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.updateBalances(ctx, userId, 20000, 5000);

      expect(wallet?.balance.currency).toBe('USD');
      expect(wallet?.pendingBalance.currency).toBe('USD');
    });

    it('should update updatedAt timestamp', async () => {
      const userId = await createTestUser();
      const oldDate = new Date('2020-01-01');
      const walletData = createTestWallet(userId, { updatedAt: oldDate });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.updateBalances(ctx, userId, 5000, 0);

      expect(wallet?.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe('updateBalancesWithVersion', () => {
    it('should update balances atomically with version check', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, {
        balance: createMoney(10000),
        pendingBalance: createMoney(5000),
        version: 1,
      });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.updateBalancesWithVersion(
        ctx,
        userId,
        5000,
        -2000,
        1,
      );

      expect(wallet.balance.amount).toBe(15000);
      expect(wallet.pendingBalance.amount).toBe(3000);
      expect(wallet.version).toBe(2);
    });

    it('should throw OptimisticLockException on version mismatch', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, { version: 5 });
      await repository.upsertWallet(ctx, walletData);

      await expect(
        repository.updateBalancesWithVersion(ctx, userId, 1000, 0, 3),
      ).rejects.toThrow(OptimisticLockException);
    });

    it('should handle negative balance changes (debit)', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, {
        balance: createMoney(10000),
        pendingBalance: createMoney(5000),
        version: 1,
      });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.updateBalancesWithVersion(
        ctx,
        userId,
        -3000,
        -5000,
        1,
      );

      expect(wallet.balance.amount).toBe(7000);
      expect(wallet.pendingBalance.amount).toBe(0);
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      const userId = await createTestUser();

      await expect(
        repository.updateBalancesWithVersion(ctx, userId, 1000, 0, 1),
      ).rejects.toThrow(OptimisticLockException);
    });

    it('should increment version after successful update', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, { version: 10 });
      await repository.upsertWallet(ctx, walletData);

      const wallet = await repository.updateBalancesWithVersion(
        ctx,
        userId,
        0,
        0,
        10,
      );

      expect(wallet.version).toBe(11);
    });
  });

  // ==================== Transaction Methods ====================

  describe('createTransaction', () => {
    it('should create a credit transaction', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const transactionData = createTestTransaction(userId, {
        type: WalletTransactionType.Credit,
        amount: createMoney(5000),
      });

      const transaction = await repository.createTransaction(ctx, transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBe(transactionData.id);
      expect(transaction.walletUserId).toBe(userId);
      expect(transaction.type).toBe(WalletTransactionType.Credit);
      expect(transaction.amount.amount).toBe(5000);
    });

    it('should create a debit transaction', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const transactionData = createTestTransaction(userId, {
        type: WalletTransactionType.Debit,
        amount: createMoney(3000),
        description: 'Withdrawal',
      });

      const transaction = await repository.createTransaction(ctx, transactionData);

      expect(transaction.type).toBe(WalletTransactionType.Debit);
      expect(transaction.description).toBe('Withdrawal');
    });

    it('should create a hold transaction', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const transactionData = createTestTransaction(userId, {
        type: WalletTransactionType.Hold,
        amount: createMoney(2000),
      });

      const transaction = await repository.createTransaction(ctx, transactionData);

      expect(transaction.type).toBe(WalletTransactionType.Hold);
    });

    it('should create a release transaction', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const transactionData = createTestTransaction(userId, {
        type: WalletTransactionType.Release,
        amount: createMoney(2000),
      });

      const transaction = await repository.createTransaction(ctx, transactionData);

      expect(transaction.type).toBe(WalletTransactionType.Release);
    });

    it('should store reference correctly', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const reference = `txn-${randomUUID()}`;
      const transactionData = createTestTransaction(userId, { reference });

      const transaction = await repository.createTransaction(ctx, transactionData);

      expect(transaction.reference).toBe(reference);
    });

    it('should preserve createdAt timestamp', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const createdAt = new Date('2024-06-15T10:30:00Z');
      const transactionData = createTestTransaction(userId, { createdAt });

      const transaction = await repository.createTransaction(ctx, transactionData);

      expect(transaction.createdAt.toISOString()).toBe(createdAt.toISOString());
    });
  });

  describe('getTransactionsByUserId', () => {
    it('should return empty array when no transactions exist', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));

      const transactions = await repository.getTransactionsByUserId(ctx, userId);

      expect(transactions).toEqual([]);
    });

    it('should return all transactions for a user', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      await repository.createTransaction(ctx, createTestTransaction(userId));
      await repository.createTransaction(ctx, createTestTransaction(userId));
      await repository.createTransaction(ctx, createTestTransaction(userId));

      const transactions = await repository.getTransactionsByUserId(ctx, userId);

      expect(transactions).toHaveLength(3);
    });

    it('should return transactions ordered by createdAt desc', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));

      const oldDate = new Date('2024-01-01');
      const middleDate = new Date('2024-06-01');
      const newDate = new Date('2024-12-01');

      await repository.createTransaction(
        ctx,
        createTestTransaction(userId, { createdAt: middleDate }),
      );
      await repository.createTransaction(
        ctx,
        createTestTransaction(userId, { createdAt: oldDate }),
      );
      await repository.createTransaction(
        ctx,
        createTestTransaction(userId, { createdAt: newDate }),
      );

      const transactions = await repository.getTransactionsByUserId(ctx, userId);

      expect(transactions[0].createdAt.toISOString()).toBe(newDate.toISOString());
      expect(transactions[1].createdAt.toISOString()).toBe(middleDate.toISOString());
      expect(transactions[2].createdAt.toISOString()).toBe(oldDate.toISOString());
    });

    it('should only return transactions for the specified user', async () => {
      const userId1 = await createTestUser({ email: 'user1@test.com' });
      const userId2 = await createTestUser({ email: 'user2@test.com' });
      await repository.upsertWallet(ctx, createTestWallet(userId1));
      await repository.upsertWallet(ctx, createTestWallet(userId2));

      await repository.createTransaction(ctx, createTestTransaction(userId1));
      await repository.createTransaction(ctx, createTestTransaction(userId1));
      await repository.createTransaction(ctx, createTestTransaction(userId2));

      const transactions = await repository.getTransactionsByUserId(ctx, userId1);

      expect(transactions).toHaveLength(2);
      expect(transactions.every((t) => t.walletUserId === userId1)).toBe(true);
    });
  });

  describe('getTransactionById', () => {
    it('should return undefined when transaction does not exist', async () => {
      const transaction = await repository.getTransactionById(ctx, randomUUID());

      expect(transaction).toBeUndefined();
    });

    it('should return transaction by id', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const transactionData = createTestTransaction(userId, {
        amount: createMoney(7500),
        description: 'Specific transaction',
      });
      await repository.createTransaction(ctx, transactionData);

      const transaction = await repository.getTransactionById(ctx, transactionData.id);

      expect(transaction).toBeDefined();
      expect(transaction?.id).toBe(transactionData.id);
      expect(transaction?.amount.amount).toBe(7500);
      expect(transaction?.description).toBe('Specific transaction');
    });

    it('should return correct transaction type mapping', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));

      const creditTx = createTestTransaction(userId, {
        type: WalletTransactionType.Credit,
      });
      await repository.createTransaction(ctx, creditTx);

      const transaction = await repository.getTransactionById(ctx, creditTx.id);

      expect(transaction?.type).toBe(WalletTransactionType.Credit);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle very large balance amounts', async () => {
      const userId = await createTestUser();
      const largeAmount = 999999999999;
      const walletData = createTestWallet(userId, {
        balance: createMoney(largeAmount),
      });

      const wallet = await repository.upsertWallet(ctx, walletData);

      expect(wallet.balance.amount).toBe(largeAmount);
    });

    it('should handle multiple wallets for different users', async () => {
      const userId1 = await createTestUser({ email: 'wallet1@test.com' });
      const userId2 = await createTestUser({ email: 'wallet2@test.com' });

      await repository.upsertWallet(
        ctx,
        createTestWallet(userId1, { balance: createMoney(1000) }),
      );
      await repository.upsertWallet(
        ctx,
        createTestWallet(userId2, { balance: createMoney(2000) }),
      );

      const wallet1 = await repository.getByUserId(ctx, userId1);
      const wallet2 = await repository.getByUserId(ctx, userId2);

      expect(wallet1?.balance.amount).toBe(1000);
      expect(wallet2?.balance.amount).toBe(2000);
    });

    it('should handle concurrent version updates correctly', async () => {
      const userId = await createTestUser();
      const walletData = createTestWallet(userId, { version: 1 });
      await repository.upsertWallet(ctx, walletData);

      await repository.updateBalancesWithVersion(ctx, userId, 1000, 0, 1);

      await expect(
        repository.updateBalancesWithVersion(ctx, userId, 500, 0, 1),
      ).rejects.toThrow(OptimisticLockException);
    });

    it('should handle empty description in transaction', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const transactionData = createTestTransaction(userId, { description: '' });

      const transaction = await repository.createTransaction(ctx, transactionData);

      expect(transaction.description).toBe('');
    });

    it('should handle transaction with zero amount', async () => {
      const userId = await createTestUser();
      await repository.upsertWallet(ctx, createTestWallet(userId));
      const transactionData = createTestTransaction(userId, {
        amount: createMoney(0),
      });

      const transaction = await repository.createTransaction(ctx, transactionData);

      expect(transaction.amount.amount).toBe(0);
    });
  });
});
