import { PrismaClient, Role, SeatingType as PrismaSeatingType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PricingRepository } from '@/modules/payments/pricing/pricing.repository';
import type {
  PricingSnapshot,
  PaymentMethodCommissionSnapshot,
} from '@/modules/payments/pricing/pricing.domain';
import type { Money } from '@/modules/payments/payments.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../../setup/test-utils';

describe('PricingRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: PricingRepository;
  let ctx: Ctx;

  let testSellerId: string;
  let testListingId: string;
  let testEventId: string;
  let testEventDateId: string;
  let testEventSectionId: string;

  const createMoney = (amount: number, currency: string = 'EUR'): Money => ({
    amount,
    currency: currency as Money['currency'],
  });

  const createPaymentMethodCommissions = (): PaymentMethodCommissionSnapshot[] => [
    { paymentMethodId: 'pm-card', paymentMethodName: 'Credit Card', commissionPercent: 2.5 },
    { paymentMethodId: 'pm-transfer', paymentMethodName: 'Bank Transfer', commissionPercent: 0 },
  ];

  const createTestUser = async (overrides?: Partial<{
    email: string;
    role: Role;
    acceptedSellerTermsAt: Date | null;
  }>): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: overrides?.email ?? `user-${Date.now()}-${randomUUID()}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        publicName: `testuser-${randomUUID().slice(0, 8)}`,
        password: 'hashedpassword',
        role: overrides?.role ?? Role.User,
        acceptedSellerTermsAt: overrides?.acceptedSellerTermsAt ?? new Date(),
        status: 'Enabled',
        country: 'Germany',
        currency: 'EUR',
        language: 'en',
        emailVerified: true,
        phoneVerified: false,
      },
    });
    return user.id;
  };

  const createTestEvent = async (createdBy: string): Promise<string> => {
    const event = await prisma.event.create({
      data: {
        name: `Test Event ${randomUUID().slice(0, 8)}`,
        category: 'Concert',
        venue: 'Test Venue',
        location: {
          street: '123 Main St',
          city: 'Berlin',
          state: 'Berlin',
          postalCode: '10115',
          country: 'Germany',
        },
        imageIds: [],
        status: 'approved',
        createdBy: { connect: { id: createdBy } },
      },
    });
    return event.id;
  };

  const createTestEventDate = async (eventId: string, createdBy: string): Promise<string> => {
    const eventDate = await prisma.eventDate.create({
      data: {
        event: { connect: { id: eventId } },
        date: new Date('2026-06-15T20:00:00Z'),
        status: 'approved',
        createdBy: { connect: { id: createdBy } },
      },
    });
    return eventDate.id;
  };

  const createTestEventSection = async (eventId: string, createdBy: string): Promise<string> => {
    const section = await prisma.eventSection.create({
      data: {
        event: { connect: { id: eventId } },
        name: `Section ${randomUUID().slice(0, 8)}`,
        seatingType: PrismaSeatingType.unnumbered,
        status: 'approved',
        createdBy: { connect: { id: createdBy } },
      },
    });
    return section.id;
  };

  const createTestListing = async (sellerId: string): Promise<string> => {
    const listing = await prisma.ticketListing.create({
      data: {
        seller: { connect: { id: sellerId } },
        event: { connect: { id: testEventId } },
        eventDate: { connect: { id: testEventDateId } },
        eventSection: { connect: { id: testEventSectionId } },
        type: 'Physical',
        sellTogether: false,
        pricePerTicket: { amount: 5000, currency: 'EUR' },
        status: 'Active',
      },
    });
    return listing.id;
  };

  const createValidPricingSnapshot = (overrides?: Partial<PricingSnapshot>): PricingSnapshot => {
    const now = new Date();
    return {
      id: randomUUID(),
      listingId: testListingId,
      pricePerTicket: createMoney(5000),
      buyerPlatformFeePercentage: 5,
      sellerPlatformFeePercentage: 10,
      paymentMethodCommissions: createPaymentMethodCommissions(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
      ...overrides,
    };
  };

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new PricingRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();

    testSellerId = await createTestUser({ email: `seller-${Date.now()}@test.com` });
    testEventId = await createTestEvent(testSellerId);
    testEventDateId = await createTestEventDate(testEventId, testSellerId);
    testEventSectionId = await createTestEventSection(testEventId, testSellerId);
    testListingId = await createTestListing(testSellerId);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==================== create ====================

  describe('create', () => {
    it('should create a new pricing snapshot', async () => {
      const snapshotData = createValidPricingSnapshot();

      const snapshot = await repository.create(ctx, snapshotData);

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBe(snapshotData.id);
      expect(snapshot.listingId).toBe(testListingId);
    });

    it('should create a pricing snapshot with all pricing fields', async () => {
      const snapshotData = createValidPricingSnapshot();

      const snapshot = await repository.create(ctx, snapshotData);

      expect(snapshot.pricePerTicket).toEqual(snapshotData.pricePerTicket);
      expect(snapshot.buyerPlatformFeePercentage).toBe(snapshotData.buyerPlatformFeePercentage);
      expect(snapshot.sellerPlatformFeePercentage).toBe(snapshotData.sellerPlatformFeePercentage);
      expect(snapshot.paymentMethodCommissions).toEqual(snapshotData.paymentMethodCommissions);
    });

    it('should create a pricing snapshot with consumption data', async () => {
      const consumedAt = new Date();
      const transactionId = randomUUID();
      const paymentMethodId = 'pm-card';
      const snapshotData = createValidPricingSnapshot({
        consumedAt,
        consumedByTransactionId: transactionId,
        selectedPaymentMethodId: paymentMethodId,
      });

      const snapshot = await repository.create(ctx, snapshotData);

      expect(snapshot.consumedAt).toEqual(consumedAt);
      expect(snapshot.consumedByTransactionId).toBe(transactionId);
      expect(snapshot.selectedPaymentMethodId).toBe(paymentMethodId);
    });

    it('should create a pricing snapshot with null commission percent', async () => {
      const commissions: PaymentMethodCommissionSnapshot[] = [
        { paymentMethodId: 'pm-card', paymentMethodName: 'Credit Card', commissionPercent: null },
      ];
      const snapshotData = createValidPricingSnapshot({
        paymentMethodCommissions: commissions,
      });

      const snapshot = await repository.create(ctx, snapshotData);

      expect(snapshot.paymentMethodCommissions[0].commissionPercent).toBeNull();
    });
  });

  // ==================== findById ====================

  describe('findById', () => {
    it('should return undefined when snapshot does not exist', async () => {
      const snapshot = await repository.findById(ctx, 'non-existent-id');
      expect(snapshot).toBeUndefined();
    });

    it('should find snapshot by id', async () => {
      const created = await repository.create(ctx, createValidPricingSnapshot());

      const found = await repository.findById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.listingId).toBe(testListingId);
    });

    it('should return snapshot with all fields correctly mapped', async () => {
      const snapshotData = createValidPricingSnapshot();
      await repository.create(ctx, snapshotData);

      const found = await repository.findById(ctx, snapshotData.id);

      expect(found?.pricePerTicket).toEqual(snapshotData.pricePerTicket);
      expect(found?.buyerPlatformFeePercentage).toBe(snapshotData.buyerPlatformFeePercentage);
      expect(found?.sellerPlatformFeePercentage).toBe(snapshotData.sellerPlatformFeePercentage);
      expect(found?.paymentMethodCommissions).toEqual(snapshotData.paymentMethodCommissions);
    });
  });

  // ==================== update ====================

  describe('update', () => {
    it('should return undefined for non-existent snapshot', async () => {
      const result = await repository.update(ctx, 'non-existent-id', { buyerPlatformFeePercentage: 10 });
      expect(result).toBeUndefined();
    });

    it('should update pricing percentages', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());

      const updated = await repository.update(ctx, snapshot.id, {
        buyerPlatformFeePercentage: 7,
        sellerPlatformFeePercentage: 12,
      });

      expect(updated?.buyerPlatformFeePercentage).toBe(7);
      expect(updated?.sellerPlatformFeePercentage).toBe(12);
    });

    it('should update price per ticket', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());
      const newPrice = createMoney(7500);

      const updated = await repository.update(ctx, snapshot.id, {
        pricePerTicket: newPrice,
      });

      expect(updated?.pricePerTicket).toEqual(newPrice);
    });

    it('should update payment method commissions', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());
      const newCommissions: PaymentMethodCommissionSnapshot[] = [
        { paymentMethodId: 'pm-wallet', paymentMethodName: 'E-Wallet', commissionPercent: 1.5 },
      ];

      const updated = await repository.update(ctx, snapshot.id, {
        paymentMethodCommissions: newCommissions,
      });

      expect(updated?.paymentMethodCommissions).toEqual(newCommissions);
    });

    it('should update expiration date', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());
      const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const updated = await repository.update(ctx, snapshot.id, {
        expiresAt: newExpiresAt,
      });

      expect(updated?.expiresAt).toEqual(newExpiresAt);
    });

    it('should update consumption data', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());
      const consumedAt = new Date();
      const transactionId = randomUUID();
      const paymentMethodId = 'pm-card';

      const updated = await repository.update(ctx, snapshot.id, {
        consumedAt,
        consumedByTransactionId: transactionId,
        selectedPaymentMethodId: paymentMethodId,
      });

      expect(updated?.consumedAt).toEqual(consumedAt);
      expect(updated?.consumedByTransactionId).toBe(transactionId);
      expect(updated?.selectedPaymentMethodId).toBe(paymentMethodId);
    });

    it('should update listing id', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());
      const newListingId = await createTestListing(testSellerId);

      const updated = await repository.update(ctx, snapshot.id, {
        listingId: newListingId,
      });

      expect(updated?.listingId).toBe(newListingId);
    });

    it('should not update fields when passed undefined', async () => {
      const originalData = createValidPricingSnapshot();
      const snapshot = await repository.create(ctx, originalData);

      const updated = await repository.update(ctx, snapshot.id, {
        buyerPlatformFeePercentage: undefined,
        sellerPlatformFeePercentage: undefined,
      });

      expect(updated?.buyerPlatformFeePercentage).toBe(originalData.buyerPlatformFeePercentage);
      expect(updated?.sellerPlatformFeePercentage).toBe(originalData.sellerPlatformFeePercentage);
    });

  });

  // ==================== deleteExpired ====================

  describe('deleteExpired', () => {
    it('should return 0 when no expired snapshots exist', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      await repository.create(ctx, createValidPricingSnapshot({ expiresAt: futureDate }));

      const deletedCount = await repository.deleteExpired(ctx);

      expect(deletedCount).toBe(0);
    });

    it('should delete expired unconsumed snapshots', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(ctx, createValidPricingSnapshot({ expiresAt: pastDate }));

      const deletedCount = await repository.deleteExpired(ctx);

      expect(deletedCount).toBe(1);
    });

    it('should not delete expired but consumed snapshots', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(ctx, createValidPricingSnapshot({
        expiresAt: pastDate,
        consumedByTransactionId: randomUUID(),
        consumedAt: new Date(),
      }));

      const deletedCount = await repository.deleteExpired(ctx);

      expect(deletedCount).toBe(0);
    });

    it('should delete multiple expired unconsumed snapshots', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(ctx, createValidPricingSnapshot({ expiresAt: pastDate }));
      await repository.create(ctx, createValidPricingSnapshot({ expiresAt: pastDate }));
      await repository.create(ctx, createValidPricingSnapshot({ expiresAt: pastDate }));

      const deletedCount = await repository.deleteExpired(ctx);

      expect(deletedCount).toBe(3);
    });

    it('should only delete expired snapshots, not future ones', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const expiredSnapshot = await repository.create(ctx, createValidPricingSnapshot({ expiresAt: pastDate }));
      const validSnapshot = await repository.create(ctx, createValidPricingSnapshot({ expiresAt: futureDate }));

      const deletedCount = await repository.deleteExpired(ctx);

      expect(deletedCount).toBe(1);
      expect(await repository.findById(ctx, expiredSnapshot.id)).toBeUndefined();
      expect(await repository.findById(ctx, validSnapshot.id)).toBeDefined();
    });
  });

  // ==================== consumeAtomic ====================

  describe('consumeAtomic', () => {
    it('should consume a valid snapshot atomically', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());
      const transactionId = randomUUID();
      const paymentMethodId = 'pm-card';

      const consumed = await repository.consumeAtomic(
        ctx,
        snapshot.id,
        testListingId,
        transactionId,
        paymentMethodId,
      );

      expect(consumed).toBeDefined();
      expect(consumed?.consumedByTransactionId).toBe(transactionId);
      expect(consumed?.selectedPaymentMethodId).toBe(paymentMethodId);
      expect(consumed?.consumedAt).toBeDefined();
    });

    it('should return undefined when snapshot does not exist', async () => {
      const consumed = await repository.consumeAtomic(
        ctx,
        'non-existent-id',
        testListingId,
        randomUUID(),
        'pm-card',
      );

      expect(consumed).toBeUndefined();
    });

    it('should return undefined when listing id does not match', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());
      const wrongListingId = await createTestListing(testSellerId);

      const consumed = await repository.consumeAtomic(
        ctx,
        snapshot.id,
        wrongListingId,
        randomUUID(),
        'pm-card',
      );

      expect(consumed).toBeUndefined();
    });

    it('should return undefined when snapshot is already consumed', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot({
        consumedByTransactionId: randomUUID(),
        consumedAt: new Date(),
      }));

      const consumed = await repository.consumeAtomic(
        ctx,
        snapshot.id,
        testListingId,
        randomUUID(),
        'pm-card',
      );

      expect(consumed).toBeUndefined();
    });

    it('should return undefined when snapshot is expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      const snapshot = await repository.create(ctx, createValidPricingSnapshot({
        expiresAt: pastDate,
      }));

      const consumed = await repository.consumeAtomic(
        ctx,
        snapshot.id,
        testListingId,
        randomUUID(),
        'pm-card',
      );

      expect(consumed).toBeUndefined();
    });

    it('should prevent double consumption (race condition protection)', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());
      const transactionId1 = randomUUID();
      const transactionId2 = randomUUID();
      const paymentMethodId = 'pm-card';

      const [result1, result2] = await Promise.all([
        repository.consumeAtomic(ctx, snapshot.id, testListingId, transactionId1, paymentMethodId),
        repository.consumeAtomic(ctx, snapshot.id, testListingId, transactionId2, paymentMethodId),
      ]);

      const successCount = [result1, result2].filter(r => r !== undefined).length;
      expect(successCount).toBe(1);
    });

    it('should set consumedAt timestamp when consuming', async () => {
      const beforeConsume = new Date();
      const snapshot = await repository.create(ctx, createValidPricingSnapshot());

      const consumed = await repository.consumeAtomic(
        ctx,
        snapshot.id,
        testListingId,
        randomUUID(),
        'pm-card',
      );
      const afterConsume = new Date();

      expect(consumed?.consumedAt).toBeDefined();
      expect(consumed?.consumedAt!.getTime()).toBeGreaterThanOrEqual(beforeConsume.getTime());
      expect(consumed?.consumedAt!.getTime()).toBeLessThanOrEqual(afterConsume.getTime());
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle zero commission percentages', async () => {
      const commissions: PaymentMethodCommissionSnapshot[] = [
        { paymentMethodId: 'pm-free', paymentMethodName: 'Free Transfer', commissionPercent: 0 },
      ];
      const snapshot = await repository.create(ctx, createValidPricingSnapshot({
        buyerPlatformFeePercentage: 0,
        sellerPlatformFeePercentage: 0,
        paymentMethodCommissions: commissions,
      }));

      expect(snapshot.buyerPlatformFeePercentage).toBe(0);
      expect(snapshot.sellerPlatformFeePercentage).toBe(0);
      expect(snapshot.paymentMethodCommissions[0].commissionPercent).toBe(0);
    });

    it('should handle large percentage values', async () => {
      const snapshot = await repository.create(ctx, createValidPricingSnapshot({
        buyerPlatformFeePercentage: 99.99,
        sellerPlatformFeePercentage: 99.99,
      }));

      expect(snapshot.buyerPlatformFeePercentage).toBe(99.99);
      expect(snapshot.sellerPlatformFeePercentage).toBe(99.99);
    });

    it('should handle multiple payment method commissions', async () => {
      const commissions: PaymentMethodCommissionSnapshot[] = [
        { paymentMethodId: 'pm-card', paymentMethodName: 'Credit Card', commissionPercent: 2.5 },
        { paymentMethodId: 'pm-transfer', paymentMethodName: 'Bank Transfer', commissionPercent: 0 },
        { paymentMethodId: 'pm-wallet', paymentMethodName: 'E-Wallet', commissionPercent: 1.5 },
        { paymentMethodId: 'pm-crypto', paymentMethodName: 'Crypto', commissionPercent: null },
      ];
      const snapshot = await repository.create(ctx, createValidPricingSnapshot({
        paymentMethodCommissions: commissions,
      }));

      expect(snapshot.paymentMethodCommissions).toHaveLength(4);
      expect(snapshot.paymentMethodCommissions).toEqual(commissions);
    });

    it('should handle different currencies in price', async () => {
      const currencies = ['EUR', 'USD', 'GBP', 'MXN'];

      for (const currency of currencies) {
        const snapshot = await repository.create(ctx, createValidPricingSnapshot({
          pricePerTicket: createMoney(10000, currency),
        }));
        expect(snapshot.pricePerTicket.currency).toBe(currency);
      }
    });

    it('should handle very far future expiration dates', async () => {
      const farFutureDate = new Date('2099-12-31T23:59:59.999Z');
      const snapshot = await repository.create(ctx, createValidPricingSnapshot({
        expiresAt: farFutureDate,
      }));

      expect(snapshot.expiresAt).toEqual(farFutureDate);
    });

    it('should handle snapshot with all optional fields set', async () => {
      const consumedAt = new Date();
      const transactionId = randomUUID();
      const paymentMethodId = 'pm-card';

      const snapshot = await repository.create(ctx, createValidPricingSnapshot({
        consumedAt,
        consumedByTransactionId: transactionId,
        selectedPaymentMethodId: paymentMethodId,
      }));

      expect(snapshot.consumedAt).toEqual(consumedAt);
      expect(snapshot.consumedByTransactionId).toBe(transactionId);
      expect(snapshot.selectedPaymentMethodId).toBe(paymentMethodId);
    });

    it('should maintain data integrity across create and findById', async () => {
      const originalData = createValidPricingSnapshot();
      await repository.create(ctx, originalData);

      const found = await repository.findById(ctx, originalData.id);

      expect(found?.id).toBe(originalData.id);
      expect(found?.listingId).toBe(originalData.listingId);
      expect(found?.pricePerTicket).toEqual(originalData.pricePerTicket);
      expect(found?.buyerPlatformFeePercentage).toBe(originalData.buyerPlatformFeePercentage);
      expect(found?.sellerPlatformFeePercentage).toBe(originalData.sellerPlatformFeePercentage);
    });
  });
});
