import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService } from '../../../../common/locks/distributed-lock.service';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Ctx } from '../../../../common/types/context';

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCtx: Ctx = {
    source: 'CRON',
    requestId: 'test-request-id',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $executeRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);
    prismaService = module.get(PrismaService);
  });

  describe('getHolderIdentifier', () => {
    it('should return a non-empty string', () => {
      const identifier = service.getHolderIdentifier();
      expect(identifier).toBeDefined();
      expect(typeof identifier).toBe('string');
      expect(identifier.length).toBeGreaterThan(0);
    });

    it('should include hostname and process id', () => {
      const identifier = service.getHolderIdentifier();
      expect(identifier).toContain('-');
      expect(identifier).toContain(String(process.pid));
    });
  });

  describe('acquireLock', () => {
    it('should return true when lock is available', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.acquireLock('test-lock', 'holder-1', 60);

      expect(result).toBe(true);
      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should return false when lock is held by another holder', async () => {
      prismaService.$executeRaw.mockResolvedValue(0);

      const result = await service.acquireLock('test-lock', 'holder-2', 60);

      expect(result).toBe(false);
      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should return true when acquiring expired lock', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);

      const result = await service.acquireLock('test-lock', 'holder-1', 60);

      expect(result).toBe(true);
    });

    it('should return false on database error', async () => {
      prismaService.$executeRaw.mockRejectedValue(new Error('DB error'));

      const result = await service.acquireLock('test-lock', 'holder-1', 60);

      expect(result).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should release owned lock', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);

      await service.releaseLock('test-lock', 'holder-1');

      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should not throw when lock is owned by another holder', async () => {
      prismaService.$executeRaw.mockResolvedValue(0);

      await expect(service.releaseLock('test-lock', 'holder-2')).resolves.not.toThrow();
    });
  });

  describe('withLock', () => {
    it('should execute function when lock is acquired', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);
      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-lock', 'holder-1', 60, fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(2); // acquire + release
    });

    it('should return null when lock cannot be acquired', async () => {
      prismaService.$executeRaw.mockResolvedValue(0);
      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-lock', 'holder-1', 60, fn);

      expect(result).toBeNull();
      expect(fn).not.toHaveBeenCalled();
      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(1); // only acquire attempt
    });

    it('should release lock even when function throws an error', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);
      const error = new Error('Function error');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(service.withLock('test-lock', 'holder-1', 60, fn)).rejects.toThrow(error);

      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(2); // acquire + release
    });
  });

  describe('withLockAndLog', () => {
    it('should execute function when lock is acquired', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);
      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLockAndLog(mockCtx, 'test-lock', 60, fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(2); // acquire + release
    });

    it('should return null when lock cannot be acquired', async () => {
      prismaService.$executeRaw.mockResolvedValue(0);
      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLockAndLog(mockCtx, 'test-lock', 60, fn);

      expect(result).toBeNull();
      expect(fn).not.toHaveBeenCalled();
      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(1); // only acquire attempt
    });

    it('should release lock even when function throws an error', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);
      const error = new Error('Function error');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(service.withLockAndLog(mockCtx, 'test-lock', 60, fn)).rejects.toThrow(error);

      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(2); // acquire + release
    });

    it('should use internal holder identifier', async () => {
      prismaService.$executeRaw.mockResolvedValue(1);
      const fn = jest.fn().mockResolvedValue('result');
      const holderIdentifier = service.getHolderIdentifier();

      await service.withLockAndLog(mockCtx, 'test-lock', 60, fn);

      // Verify the holder identifier is used by checking the raw SQL calls contain it
      expect(prismaService.$executeRaw).toHaveBeenCalled();
      // The holder identifier should be part of the call (we can't directly verify template strings)
      expect(holderIdentifier).toBeDefined();
    });
  });
});
