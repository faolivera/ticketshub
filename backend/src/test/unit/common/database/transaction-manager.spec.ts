import { Test, TestingModule } from '@nestjs/testing';
import { TransactionManager } from '../../../../common/database/transaction-manager';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Ctx } from '../../../../common/types/context';
import { TxCtx, PrismaTransactionClient } from '../../../../common/database/types';

describe('TransactionManager', () => {
  let transactionManager: TransactionManager;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCtx: Ctx = {
    source: 'HTTP',
    requestId: 'test-request-id',
  };

  const mockTxClient = {
    user: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  } as unknown as PrismaTransactionClient;

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
      user: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionManager,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    transactionManager = module.get<TransactionManager>(TransactionManager);
    prismaService = module.get(PrismaService);
  });

  describe('executeInTransaction', () => {
    it('should execute function in a new transaction when ctx has no tx', async () => {
      const expectedResult = { id: 'test' };
      const mockFn = jest.fn().mockResolvedValue(expectedResult);

      prismaService.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTxClient);
      });

      const result = await transactionManager.executeInTransaction(mockCtx, mockFn);

      expect(result).toEqual(expectedResult);
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockCtx,
          tx: mockTxClient,
        }),
      );
    });

    it('should reuse existing transaction when ctx already has tx', async () => {
      const expectedResult = { id: 'test' };
      const mockFn = jest.fn().mockResolvedValue(expectedResult);

      const ctxWithTx: TxCtx = {
        ...mockCtx,
        tx: mockTxClient,
      };

      const result = await transactionManager.executeInTransaction(ctxWithTx, mockFn);

      expect(result).toEqual(expectedResult);
      expect(prismaService.$transaction).not.toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledWith(ctxWithTx);
    });

    it('should rollback on error', async () => {
      const testError = new Error('Test error');
      const mockFn = jest.fn().mockRejectedValue(testError);

      prismaService.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTxClient);
      });

      await expect(transactionManager.executeInTransaction(mockCtx, mockFn)).rejects.toThrow(testError);
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should respect isolation level option', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');

      prismaService.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTxClient);
      });

      await transactionManager.executeInTransaction(mockCtx, mockFn, {
        isolationLevel: 'Serializable',
      });

      expect(prismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
        }),
      );
    });

    it('should respect timeout option', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');

      prismaService.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTxClient);
      });

      await transactionManager.executeInTransaction(mockCtx, mockFn, {
        timeout: 5000,
      });

      expect(prismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          timeout: 5000,
        }),
      );
    });

    it('should pass all transaction options', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');

      prismaService.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn(mockTxClient);
      });

      await transactionManager.executeInTransaction(mockCtx, mockFn, {
        isolationLevel: 'RepeatableRead',
        timeout: 10000,
      });

      expect(prismaService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'RepeatableRead',
          timeout: 10000,
        }),
      );
    });
  });

  describe('getClient', () => {
    it('should return tx client when in transaction', () => {
      const ctxWithTx: TxCtx = {
        ...mockCtx,
        tx: mockTxClient,
      };

      const client = transactionManager.getClient(ctxWithTx);

      expect(client).toBe(mockTxClient);
    });

    it('should return prisma service when not in transaction', () => {
      const client = transactionManager.getClient(mockCtx);

      expect(client).toBe(prismaService);
    });

    it('should return prisma service when tx is undefined', () => {
      const ctxWithUndefinedTx: TxCtx = {
        ...mockCtx,
        tx: undefined,
      };

      const client = transactionManager.getClient(ctxWithUndefinedTx);

      expect(client).toBe(prismaService);
    });
  });
});
