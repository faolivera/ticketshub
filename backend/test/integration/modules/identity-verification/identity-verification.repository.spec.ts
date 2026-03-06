import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { IdentityVerificationRepository } from '@/modules/identity-verification/identity-verification.repository';
import { IdentityVerificationStatus } from '@/modules/identity-verification/identity-verification.domain';
import type { IdentityVerificationRequest } from '@/modules/identity-verification/identity-verification.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('IdentityVerificationRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: IdentityVerificationRepository;
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

  const createValidRequest = (overrides?: Partial<IdentityVerificationRequest>): IdentityVerificationRequest => ({
    id: randomUUID(),
    userId: testUserId,
    legalFirstName: 'John',
    legalLastName: 'Doe',
    dateOfBirth: '1990-01-01',
    governmentIdNumber: 'ID123456',
    documentFrontStorageKey: 'docs/front.jpg',
    documentFrontFilename: 'front.jpg',
    documentBackStorageKey: 'docs/back.jpg',
    documentBackFilename: 'back.jpg',
    selfieStorageKey: 'docs/selfie.jpg',
    selfieFilename: 'selfie.jpg',
    status: IdentityVerificationStatus.Pending,
    submittedAt: new Date(),
    ...overrides,
  });

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new IdentityVerificationRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  describe('save', () => {
    it('should create new verification request', async () => {
      const request = createValidRequest();

      await repository.save(ctx, request);

      const found = await repository.findById(ctx, request.id);
      expect(found).toBeDefined();
      expect(found?.legalFirstName).toBe('John');
      expect(found?.status).toBe(IdentityVerificationStatus.Pending);
    });

    it('should update existing request', async () => {
      const request = createValidRequest();
      await repository.save(ctx, request);
      const updated = createValidRequest({
        id: request.id,
        status: IdentityVerificationStatus.Approved,
        reviewedBy: 'admin-id',
        reviewedAt: new Date(),
      });
      await repository.save(ctx, updated);
      const found = await repository.findById(ctx, request.id);
      expect(found?.status).toBe(IdentityVerificationStatus.Approved);
      expect(found?.reviewedBy).toBe('admin-id');
    });
  });

  describe('findById', () => {
    it('should return undefined when not found', async () => {
      const found = await repository.findById(ctx, 'non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should find request by id', async () => {
      const request = createValidRequest();
      await repository.save(ctx, request);
      const found = await repository.findById(ctx, request.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(request.id);
    });
  });

  describe('findByUserId', () => {
    it('should return undefined when no request for user', async () => {
      const found = await repository.findByUserId(ctx, testUserId);
      expect(found).toBeUndefined();
    });

    it('should return latest request by submittedAt', async () => {
      await repository.save(ctx, createValidRequest({ id: randomUUID(), submittedAt: new Date('2026-01-01') }));
      const latest = createValidRequest({ id: randomUUID(), submittedAt: new Date('2026-06-01') });
      await repository.save(ctx, latest);
      const found = await repository.findByUserId(ctx, testUserId);
      expect(found?.id).toBe(latest.id);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no requests', async () => {
      const list = await repository.findAll(ctx);
      expect(list).toEqual([]);
    });

    it('should filter by status when provided', async () => {
      await repository.save(ctx, createValidRequest({ id: randomUUID(), status: IdentityVerificationStatus.Pending }));
      await repository.save(ctx, createValidRequest({ id: randomUUID(), status: IdentityVerificationStatus.Approved }));
      const pending = await repository.findAll(ctx, IdentityVerificationStatus.Pending);
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe(IdentityVerificationStatus.Pending);
    });
  });

  describe('findAllPending', () => {
    it('should return only pending requests', async () => {
      await repository.save(ctx, createValidRequest({ id: randomUUID(), status: IdentityVerificationStatus.Pending }));
      await repository.save(ctx, createValidRequest({ id: randomUUID(), status: IdentityVerificationStatus.Approved }));
      const pending = await repository.findAllPending(ctx);
      expect(pending).toHaveLength(1);
    });
  });

  describe('countPending', () => {
    it('should return 0 when no pending', async () => {
      const count = await repository.countPending(ctx);
      expect(count).toBe(0);
    });

    it('should return count of pending requests', async () => {
      await repository.save(ctx, createValidRequest({ id: randomUUID() }));
      await repository.save(ctx, createValidRequest({ id: randomUUID() }));
      const count = await repository.countPending(ctx);
      expect(count).toBe(2);
    });
  });
});
