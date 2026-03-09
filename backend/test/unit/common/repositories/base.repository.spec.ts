import { PrismaService } from '../../../../src/common/prisma/prisma.service';
import { BaseRepository } from '../../../../src/common/repositories/base.repository';
import { Ctx } from '../../../../src/common/types/context';
import {
  TxCtx,
  PrismaTransactionClient,
} from '../../../../src/common/database/types';

class TestRepository extends BaseRepository {
  public exposeGetClient(ctx: Ctx): PrismaTransactionClient | PrismaService {
    return this.getClient(ctx);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCtx: Ctx = {
    source: 'HTTP',
    requestId: 'test-request-id',
  };

  const mockTxClient = {
    user: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  } as unknown as PrismaTransactionClient;

  beforeEach(() => {
    prismaService = {
      user: { findMany: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;

    repository = new TestRepository(prismaService);
  });

  describe('getClient', () => {
    it('should return tx client when ctx has tx', () => {
      const ctxWithTx: TxCtx = {
        ...mockCtx,
        tx: mockTxClient,
      };

      const client = repository.exposeGetClient(ctxWithTx);

      expect(client).toBe(mockTxClient);
    });

    it('should return prisma service when ctx has no tx', () => {
      const client = repository.exposeGetClient(mockCtx);

      expect(client).toBe(prismaService);
    });

    it('should return prisma service when tx is undefined', () => {
      const ctxWithUndefinedTx: TxCtx = {
        ...mockCtx,
        tx: undefined,
      };

      const client = repository.exposeGetClient(ctxWithUndefinedTx);

      expect(client).toBe(prismaService);
    });

    it('should work with different context sources', () => {
      const eventCtx: Ctx = {
        source: 'event',
        requestId: 'event-request-id',
      };

      const client = repository.exposeGetClient(eventCtx);

      expect(client).toBe(prismaService);
    });

    it('should return tx client regardless of context source', () => {
      const eventCtxWithTx: TxCtx = {
        source: 'event',
        requestId: 'event-request-id',
        tx: mockTxClient,
      };

      const client = repository.exposeGetClient(eventCtxWithTx);

      expect(client).toBe(mockTxClient);
    });
  });
});
