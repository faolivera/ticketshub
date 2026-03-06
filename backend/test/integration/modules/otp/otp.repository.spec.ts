import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { OTPRepository } from '@/modules/otp/otp.repository';
import { OTPType, OTPStatus } from '@/modules/otp/otp.domain';
import type { OTP } from '@/modules/otp/otp.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('OTPRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: OTPRepository;
  let ctx: Ctx;
  let testUserId: string;

  async function createTestUser(): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}-${randomUUID()}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        publicName: 'testuser',
        password: 'hash',
        role: 'User',
        status: 'Enabled',
        country: 'Germany',
        currency: 'EUR',
        language: 'en',
        emailVerified: true,
        phoneVerified: false,
      },
    });
    return user.id;
  }

  const createValidOTP = (overrides?: Partial<OTP>): OTP => ({
    id: randomUUID(),
    userId: testUserId,
    type: OTPType.EmailVerification,
    code: '123456',
    status: OTPStatus.Pending,
    expiresAt: new Date(Date.now() + 600000),
    createdAt: new Date(),
    ...overrides,
  });

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new OTPRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  describe('create', () => {
    it('should create an OTP', async () => {
      const otp = createValidOTP();

      const created = await repository.create(ctx, otp);

      expect(created.id).toBe(otp.id);
      expect(created.code).toBe('123456');
      expect(created.status).toBe(OTPStatus.Pending);
    });

    it('should create phone verification OTP', async () => {
      const otp = createValidOTP({ type: OTPType.PhoneVerification });
      const created = await repository.create(ctx, otp);
      expect(created.type).toBe(OTPType.PhoneVerification);
    });
  });

  describe('findById', () => {
    it('should return undefined when not found', async () => {
      const found = await repository.findById(ctx, 'non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should find OTP by id', async () => {
      const created = await repository.create(ctx, createValidOTP());
      const found = await repository.findById(ctx, created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('findLatestPendingByUserAndType', () => {
    it('should return undefined when no pending OTP', async () => {
      const found = await repository.findLatestPendingByUserAndType(ctx, testUserId, OTPType.EmailVerification);
      expect(found).toBeUndefined();
    });

    it('should return undefined when OTP expired', async () => {
      const otp = createValidOTP({ expiresAt: new Date(Date.now() - 1000) });
      await repository.create(ctx, otp);
      const found = await repository.findLatestPendingByUserAndType(ctx, testUserId, OTPType.EmailVerification);
      expect(found).toBeUndefined();
    });

    it('should return latest pending OTP', async () => {
      await repository.create(ctx, createValidOTP({ id: randomUUID(), code: '111111' }));
      const latest = await repository.create(ctx, createValidOTP({ id: randomUUID(), code: '222222' }));
      const found = await repository.findLatestPendingByUserAndType(ctx, testUserId, OTPType.EmailVerification);
      expect(found?.id).toBe(latest.id);
      expect(found?.code).toBe('222222');
    });
  });

  describe('expireAllPendingByUserAndType', () => {
    it('should expire all pending OTPs for user and type', async () => {
      await repository.create(ctx, createValidOTP({ id: randomUUID() }));
      await repository.create(ctx, createValidOTP({ id: randomUUID() }));
      await repository.expireAllPendingByUserAndType(ctx, testUserId, OTPType.EmailVerification);
      const found = await repository.findLatestPendingByUserAndType(ctx, testUserId, OTPType.EmailVerification);
      expect(found).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should return undefined for non-existent OTP', async () => {
      const result = await repository.updateStatus(ctx, 'non-existent-id', OTPStatus.Verified);
      expect(result).toBeUndefined();
    });

    it('should update status to verified', async () => {
      const otp = await repository.create(ctx, createValidOTP());
      const updated = await repository.updateStatus(ctx, otp.id, OTPStatus.Verified);
      expect(updated?.status).toBe(OTPStatus.Verified);
      expect(updated?.verifiedAt).toBeDefined();
    });

    it('should update status to expired', async () => {
      const otp = await repository.create(ctx, createValidOTP());
      const updated = await repository.updateStatus(ctx, otp.id, OTPStatus.Expired);
      expect(updated?.status).toBe(OTPStatus.Expired);
    });
  });

  describe('delete', () => {
    it('should delete OTP', async () => {
      const otp = await repository.create(ctx, createValidOTP());
      await repository.delete(ctx, otp.id);
      const found = await repository.findById(ctx, otp.id);
      expect(found).toBeUndefined();
    });

    it('should not throw when deleting non-existent OTP', async () => {
      await expect(repository.delete(ctx, 'non-existent-id')).resolves.not.toThrow();
    });
  });
});
