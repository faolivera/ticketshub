import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { TermsRepository } from '@/modules/terms/terms.repository';
import { TermsUserType } from '@/modules/terms/terms.domain';
import type { UserTermsAcceptance, UserTermsState } from '@/modules/terms/terms.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('TermsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: TermsRepository;
  let ctx: Ctx;
  let testUserId: string;
  let buyerVersionId: string;
  let sellerVersionId: string;

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

  async function createTermsVersion(userType: 'buyer' | 'seller', status: 'draft' | 'active' = 'active'): Promise<string> {
    const v = await prisma.termsVersion.create({
      data: {
        userType,
        version: '1.0.0',
        content: 'Terms content',
        status,
        publishedAt: status === 'active' ? new Date() : null,
      },
    });
    return v.id;
  }

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new TermsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
    testUserId = await createTestUser();
    buyerVersionId = await createTermsVersion('buyer');
    sellerVersionId = await createTermsVersion('seller');
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  describe('findVersionById', () => {
    it('should return undefined when not found', async () => {
      const found = await repository.findVersionById(ctx, 'non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should find terms version by id', async () => {
      const found = await repository.findVersionById(ctx, buyerVersionId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(buyerVersionId);
      expect(found?.userType).toBe(TermsUserType.Buyer);
    });
  });

  describe('findActiveByUserType', () => {
    it('should return undefined when no active version', async () => {
      await truncateAllTables(prisma);
      testUserId = await createTestUser();
      await createTermsVersion('buyer', 'draft');
      const found = await repository.findActiveByUserType(ctx, TermsUserType.Buyer);
      expect(found).toBeUndefined();
    });

    it('should find active version for buyer', async () => {
      const found = await repository.findActiveByUserType(ctx, TermsUserType.Buyer);
      expect(found).toBeDefined();
      expect(found?.userType).toBe(TermsUserType.Buyer);
    });

    it('should find active version for seller', async () => {
      const found = await repository.findActiveByUserType(ctx, TermsUserType.Seller);
      expect(found).toBeDefined();
      expect(found?.userType).toBe(TermsUserType.Seller);
    });
  });

  describe('findAcceptance', () => {
    it('should return undefined when no acceptance', async () => {
      const found = await repository.findAcceptance(ctx, testUserId, buyerVersionId);
      expect(found).toBeUndefined();
    });

    it('should find acceptance after create', async () => {
      const data: UserTermsAcceptance = {
        id: randomUUID(),
        userId: testUserId,
        termsVersionId: buyerVersionId,
        userType: TermsUserType.Buyer,
        status: 'accepted' as any,
        acceptanceMethod: 'checkbox' as any,
        ipAddress: null,
        userAgent: null,
        notifiedAt: new Date(),
        respondedAt: new Date(),
        expiresAt: null,
        createdAt: new Date(),
      };
      await repository.createAcceptance(ctx, data);
      const found = await repository.findAcceptance(ctx, testUserId, buyerVersionId);
      expect(found).toBeDefined();
      expect(found?.userId).toBe(testUserId);
    });
  });

  describe('findAcceptancesByUser', () => {
    it('should return empty array when no acceptances', async () => {
      const list = await repository.findAcceptancesByUser(ctx, testUserId);
      expect(list).toEqual([]);
    });

    it('should filter by user type when provided', async () => {
      const data: UserTermsAcceptance = {
        id: randomUUID(),
        userId: testUserId,
        termsVersionId: buyerVersionId,
        userType: TermsUserType.Buyer,
        status: 'accepted' as any,
        acceptanceMethod: 'checkbox' as any,
        ipAddress: null,
        userAgent: null,
        notifiedAt: new Date(),
        respondedAt: new Date(),
        expiresAt: null,
        createdAt: new Date(),
      };
      await repository.createAcceptance(ctx, data);
      const list = await repository.findAcceptancesByUser(ctx, testUserId, TermsUserType.Buyer);
      expect(list).toHaveLength(1);
    });
  });

  describe('createAcceptance', () => {
    it('should create acceptance', async () => {
      const data: UserTermsAcceptance = {
        id: randomUUID(),
        userId: testUserId,
        termsVersionId: buyerVersionId,
        userType: TermsUserType.Buyer,
        status: 'accepted' as any,
        acceptanceMethod: 'checkbox' as any,
        ipAddress: null,
        userAgent: null,
        notifiedAt: new Date(),
        respondedAt: new Date(),
        expiresAt: null,
        createdAt: new Date(),
      };
      const created = await repository.createAcceptance(ctx, data);
      expect(created.id).toBe(data.id);
      expect(created.userId).toBe(testUserId);
    });
  });

  describe('findUserTermsState', () => {
    it('should return undefined when no state', async () => {
      const found = await repository.findUserTermsState(ctx, testUserId, TermsUserType.Buyer);
      expect(found).toBeUndefined();
    });

    it('should find state after upsert', async () => {
      const data: UserTermsState = {
        id: randomUUID(),
        userId: testUserId,
        userType: TermsUserType.Buyer,
        currentTermsVersionId: buyerVersionId,
        lastAcceptedVersionId: buyerVersionId,
        lastAcceptedAt: null,
        isCompliant: true,
        canOperate: true,
        requiresAction: false,
        actionDeadline: null,
        updatedAt: new Date(),
      };
      await repository.upsertUserTermsState(ctx, data);
      const found = await repository.findUserTermsState(ctx, testUserId, TermsUserType.Buyer);
      expect(found).toBeDefined();
      expect(found?.isCompliant).toBe(true);
    });
  });

  describe('upsertUserTermsState', () => {
    it('should create new state', async () => {
      const data: UserTermsState = {
        id: randomUUID(),
        userId: testUserId,
        userType: TermsUserType.Buyer,
        currentTermsVersionId: buyerVersionId,
        lastAcceptedVersionId: null,
        lastAcceptedAt: null,
        isCompliant: false,
        canOperate: true,
        requiresAction: true,
        actionDeadline: null,
        updatedAt: new Date(),
      };
      const result = await repository.upsertUserTermsState(ctx, data);
      expect(result.userId).toBe(testUserId);
      expect(result.requiresAction).toBe(true);
    });

    it('should update existing state', async () => {
      const data: UserTermsState = {
        id: randomUUID(),
        userId: testUserId,
        userType: TermsUserType.Buyer,
        currentTermsVersionId: buyerVersionId,
        lastAcceptedVersionId: buyerVersionId,
        lastAcceptedAt: null,
        isCompliant: true,
        canOperate: true,
        requiresAction: false,
        actionDeadline: null,
        updatedAt: new Date(),
      };
      await repository.upsertUserTermsState(ctx, data);
      const updated: UserTermsState = { ...data, lastAcceptedVersionId: buyerVersionId, isCompliant: true, requiresAction: false };
      const result = await repository.upsertUserTermsState(ctx, updated);
      expect(result.isCompliant).toBe(true);
    });
  });
});
