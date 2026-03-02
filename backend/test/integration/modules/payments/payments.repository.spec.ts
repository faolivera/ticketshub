import { PrismaClient, Role, UserLevel, SeatingType as PrismaSeatingType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PaymentsRepository } from '@/modules/payments/payments.repository';
import { PaymentStatus } from '@/modules/payments/payments.domain';
import type { PaymentIntent, Money, PaymentMetadata } from '@/modules/payments/payments.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('PaymentsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: PaymentsRepository;
  let ctx: Ctx;

  let testBuyerId: string;
  let testSellerId: string;
  let testListingId: string;
  let testEventId: string;
  let testEventDateId: string;
  let testEventSectionId: string;
  let testTransactionId: string;
  let testPricingSnapshotId: string;

  const createMoney = (amount: number, currency: string = 'EUR'): Money => ({
    amount,
    currency: currency as Money['currency'],
  });

  const createTestMetadata = (overrides?: Partial<PaymentMetadata>): PaymentMetadata => ({
    buyerId: testBuyerId,
    sellerId: testSellerId,
    listingId: testListingId,
    ...overrides,
  });

  const createTestUser = async (overrides?: Partial<{
    email: string;
    role: Role;
    level: UserLevel;
  }>): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: overrides?.email ?? `user-${Date.now()}-${randomUUID()}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        publicName: `testuser-${randomUUID().slice(0, 8)}`,
        password: 'hashedpassword',
        role: overrides?.role ?? Role.User,
        level: overrides?.level ?? UserLevel.Seller,
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

  const createTestPricingSnapshot = async (listingId: string): Promise<string> => {
    const id = randomUUID();
    await prisma.pricingSnapshot.create({
      data: {
        id,
        listingId,
        pricePerTicket: { amount: 5000, currency: 'EUR' },
        buyerPlatformFeePercentage: 5,
        sellerPlatformFeePercentage: 10,
        paymentMethodCommissions: { card: 2.5, transfer: 0 },
        pricingModel: 'fixed',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    return id;
  };

  const createTestTransaction = async (overrides?: Partial<{
    buyerId: string;
    sellerId: string;
    listingId: string;
    pricingSnapshotId: string;
  }>): Promise<string> => {
    const id = randomUUID();
    await prisma.transaction.create({
      data: {
        id,
        listing: { connect: { id: overrides?.listingId ?? testListingId } },
        buyer: { connect: { id: overrides?.buyerId ?? testBuyerId } },
        seller: { connect: { id: overrides?.sellerId ?? testSellerId } },
        pricingSnapshot: { connect: { id: overrides?.pricingSnapshotId ?? testPricingSnapshotId } },
        ticketType: 'Physical',
        ticketUnitIds: [],
        quantity: 2,
        ticketPrice: { amount: 10000, currency: 'EUR' },
        buyerPlatformFee: { amount: 500, currency: 'EUR' },
        sellerPlatformFee: { amount: 1000, currency: 'EUR' },
        paymentMethodCommission: { amount: 250, currency: 'EUR' },
        totalPaid: { amount: 10750, currency: 'EUR' },
        sellerReceives: { amount: 9000, currency: 'EUR' },
        status: 'PendingPayment',
        requiredActor: 'Buyer',
        paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        version: 1,
      },
    });
    return id;
  };

  const createValidPaymentIntent = (overrides?: Partial<PaymentIntent>): PaymentIntent => {
    const now = new Date();
    return {
      id: randomUUID(),
      transactionId: testTransactionId,
      amount: createMoney(10750),
      status: PaymentStatus.Pending,
      metadata: createTestMetadata(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  };

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new PaymentsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();

    testBuyerId = await createTestUser({ email: `buyer-${Date.now()}@test.com` });
    testSellerId = await createTestUser({ email: `seller-${Date.now()}@test.com` });
    testEventId = await createTestEvent(testSellerId);
    testEventDateId = await createTestEventDate(testEventId, testSellerId);
    testEventSectionId = await createTestEventSection(testEventId, testSellerId);
    testListingId = await createTestListing(testSellerId);
    testPricingSnapshotId = await createTestPricingSnapshot(testListingId);
    testTransactionId = await createTestTransaction();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==================== create ====================

  describe('create', () => {
    it('should create a new payment intent', async () => {
      const paymentData = createValidPaymentIntent();

      const payment = await repository.create(ctx, paymentData);

      expect(payment).toBeDefined();
      expect(payment.id).toBe(paymentData.id);
      expect(payment.transactionId).toBe(testTransactionId);
      expect(payment.status).toBe(PaymentStatus.Pending);
    });

    it('should create a payment intent with all amount fields', async () => {
      const paymentData = createValidPaymentIntent({
        amount: createMoney(25000, 'USD'),
      });

      const payment = await repository.create(ctx, paymentData);

      expect(payment.amount).toEqual({ amount: 25000, currency: 'USD' });
    });

    it('should create a payment intent with provider payment id', async () => {
      const paymentData = createValidPaymentIntent({
        providerPaymentId: 'pi_stripe_12345',
      });

      const payment = await repository.create(ctx, paymentData);

      expect(payment.providerPaymentId).toBe('pi_stripe_12345');
    });

    it('should create a payment intent with full metadata', async () => {
      const metadata: PaymentMetadata = {
        buyerId: testBuyerId,
        sellerId: testSellerId,
        listingId: testListingId,
        eventName: 'Rock Concert 2026',
        ticketDescription: 'VIP Section - Row A',
      };
      const paymentData = createValidPaymentIntent({ metadata });

      const payment = await repository.create(ctx, paymentData);

      expect(payment.metadata).toEqual(metadata);
      expect(payment.metadata.eventName).toBe('Rock Concert 2026');
      expect(payment.metadata.ticketDescription).toBe('VIP Section - Row A');
    });

    it('should create a payment intent with processing status', async () => {
      const paymentData = createValidPaymentIntent({
        status: PaymentStatus.Processing,
      });

      const payment = await repository.create(ctx, paymentData);

      expect(payment.status).toBe(PaymentStatus.Processing);
    });

    it('should create a payment intent with succeeded status', async () => {
      const paymentData = createValidPaymentIntent({
        status: PaymentStatus.Succeeded,
        providerPaymentId: 'pi_succeeded_123',
      });

      const payment = await repository.create(ctx, paymentData);

      expect(payment.status).toBe(PaymentStatus.Succeeded);
    });
  });

  // ==================== findById ====================

  describe('findById', () => {
    it('should return undefined when payment intent does not exist', async () => {
      const payment = await repository.findById(ctx, 'non-existent-id');
      expect(payment).toBeUndefined();
    });

    it('should find payment intent by id', async () => {
      const created = await repository.create(ctx, createValidPaymentIntent());

      const found = await repository.findById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.transactionId).toBe(testTransactionId);
    });

    it('should return all fields when finding by id', async () => {
      const metadata: PaymentMetadata = {
        buyerId: testBuyerId,
        sellerId: testSellerId,
        listingId: testListingId,
        eventName: 'Test Event',
        ticketDescription: 'General Admission',
      };
      const paymentData = createValidPaymentIntent({
        providerPaymentId: 'pi_test_123',
        metadata,
      });
      await repository.create(ctx, paymentData);

      const found = await repository.findById(ctx, paymentData.id);

      expect(found?.providerPaymentId).toBe('pi_test_123');
      expect(found?.metadata).toEqual(metadata);
    });
  });

  // ==================== findByTransactionId ====================

  describe('findByTransactionId', () => {
    it('should return undefined when no payment for transaction exists', async () => {
      const payment = await repository.findByTransactionId(ctx, 'non-existent-transaction-id');
      expect(payment).toBeUndefined();
    });

    it('should find payment intent by transaction id', async () => {
      const created = await repository.create(ctx, createValidPaymentIntent());

      const found = await repository.findByTransactionId(ctx, testTransactionId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.transactionId).toBe(testTransactionId);
    });

    it('should return the correct payment when multiple transactions exist', async () => {
      const transaction2Id = await createTestTransaction();
      const payment1 = createValidPaymentIntent({ transactionId: testTransactionId });
      const payment2 = createValidPaymentIntent({ transactionId: transaction2Id });

      await repository.create(ctx, payment1);
      await repository.create(ctx, payment2);

      const found = await repository.findByTransactionId(ctx, transaction2Id);

      expect(found).toBeDefined();
      expect(found?.transactionId).toBe(transaction2Id);
      expect(found?.id).toBe(payment2.id);
    });
  });

  // ==================== findByProviderPaymentId ====================

  describe('findByProviderPaymentId', () => {
    it('should return undefined when no payment with provider id exists', async () => {
      const payment = await repository.findByProviderPaymentId(ctx, 'non-existent-provider-id');
      expect(payment).toBeUndefined();
    });

    it('should find payment intent by provider payment id', async () => {
      const providerPaymentId = 'pi_stripe_webhook_123';
      const paymentData = createValidPaymentIntent({ providerPaymentId });
      await repository.create(ctx, paymentData);

      const found = await repository.findByProviderPaymentId(ctx, providerPaymentId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(paymentData.id);
      expect(found?.providerPaymentId).toBe(providerPaymentId);
    });

    it('should return the correct payment when multiple provider ids exist', async () => {
      const transaction2Id = await createTestTransaction();
      const payment1 = createValidPaymentIntent({
        transactionId: testTransactionId,
        providerPaymentId: 'pi_first_123',
      });
      const payment2 = createValidPaymentIntent({
        transactionId: transaction2Id,
        providerPaymentId: 'pi_second_456',
      });

      await repository.create(ctx, payment1);
      await repository.create(ctx, payment2);

      const found = await repository.findByProviderPaymentId(ctx, 'pi_second_456');

      expect(found).toBeDefined();
      expect(found?.providerPaymentId).toBe('pi_second_456');
      expect(found?.transactionId).toBe(transaction2Id);
    });

    it('should find payment without provider id returning undefined', async () => {
      const paymentData = createValidPaymentIntent();
      await repository.create(ctx, paymentData);

      const found = await repository.findByProviderPaymentId(ctx, 'any-provider-id');

      expect(found).toBeUndefined();
    });
  });

  // ==================== update ====================

  describe('update', () => {
    it('should return undefined for non-existent payment intent', async () => {
      const result = await repository.update(ctx, 'non-existent-id', {
        status: PaymentStatus.Processing,
      });
      expect(result).toBeUndefined();
    });

    it('should update payment intent status', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());

      const updated = await repository.update(ctx, payment.id, {
        status: PaymentStatus.Succeeded,
      });

      expect(updated?.status).toBe(PaymentStatus.Succeeded);
    });

    it('should update payment intent to failed status', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent({
        status: PaymentStatus.Processing,
      }));

      const updated = await repository.update(ctx, payment.id, {
        status: PaymentStatus.Failed,
      });

      expect(updated?.status).toBe(PaymentStatus.Failed);
    });

    it('should update payment intent to cancelled status', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());

      const updated = await repository.update(ctx, payment.id, {
        status: PaymentStatus.Cancelled,
      });

      expect(updated?.status).toBe(PaymentStatus.Cancelled);
    });

    it('should update provider payment id', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());

      const updated = await repository.update(ctx, payment.id, {
        providerPaymentId: 'pi_new_provider_id_789',
      });

      expect(updated?.providerPaymentId).toBe('pi_new_provider_id_789');
    });

    it('should update amount', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());
      const newAmount = createMoney(15000, 'USD');

      const updated = await repository.update(ctx, payment.id, {
        amount: newAmount,
      });

      expect(updated?.amount).toEqual(newAmount);
    });

    it('should update metadata', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());
      const newMetadata: PaymentMetadata = {
        buyerId: testBuyerId,
        sellerId: testSellerId,
        listingId: testListingId,
        eventName: 'Updated Event Name',
        ticketDescription: 'Updated Description',
      };

      const updated = await repository.update(ctx, payment.id, {
        metadata: newMetadata,
      });

      expect(updated?.metadata).toEqual(newMetadata);
    });

    it('should update multiple fields at once', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());

      const updated = await repository.update(ctx, payment.id, {
        status: PaymentStatus.Succeeded,
        providerPaymentId: 'pi_multi_update_123',
        metadata: {
          buyerId: testBuyerId,
          sellerId: testSellerId,
          listingId: testListingId,
          eventName: 'Final Event',
        },
      });

      expect(updated?.status).toBe(PaymentStatus.Succeeded);
      expect(updated?.providerPaymentId).toBe('pi_multi_update_123');
      expect(updated?.metadata.eventName).toBe('Final Event');
    });

    it('should not update fields when passed undefined', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent({
        providerPaymentId: 'pi_original_123',
        status: PaymentStatus.Processing,
      }));

      const updated = await repository.update(ctx, payment.id, {
        status: undefined,
        providerPaymentId: undefined,
      });

      expect(updated?.status).toBe(PaymentStatus.Processing);
      expect(updated?.providerPaymentId).toBe('pi_original_123');
    });

    it('should preserve createdAt when updating', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());
      const originalCreatedAt = payment.createdAt;

      const updated = await repository.update(ctx, payment.id, {
        status: PaymentStatus.Succeeded,
      });

      expect(updated?.createdAt).toEqual(originalCreatedAt);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle all payment statuses', async () => {
      const statuses = [
        PaymentStatus.Pending,
        PaymentStatus.Processing,
        PaymentStatus.Succeeded,
        PaymentStatus.Failed,
        PaymentStatus.Cancelled,
      ];

      for (const status of statuses) {
        const transaction = await createTestTransaction();
        const payment = await repository.create(ctx, createValidPaymentIntent({
          transactionId: transaction,
          status,
        }));
        expect(payment.status).toBe(status);
      }
    });

    it('should handle payment with zero amount', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent({
        amount: createMoney(0),
      }));

      expect(payment.amount.amount).toBe(0);
    });

    it('should handle payment with large amount', async () => {
      const largeAmount = createMoney(999999999);
      const payment = await repository.create(ctx, createValidPaymentIntent({
        amount: largeAmount,
      }));

      expect(payment.amount.amount).toBe(999999999);
    });

    it('should handle different currencies', async () => {
      const currencies = ['EUR', 'USD', 'GBP', 'ARS'];

      for (const currency of currencies) {
        const transaction = await createTestTransaction();
        const payment = await repository.create(ctx, createValidPaymentIntent({
          transactionId: transaction,
          amount: createMoney(10000, currency),
        }));
        expect(payment.amount.currency).toBe(currency);
      }
    });

    it('should handle empty provider payment id', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent({
        providerPaymentId: '',
      }));

      expect(payment.providerPaymentId).toBe('');
    });

    it('should handle special characters in provider payment id', async () => {
      const providerPaymentId = 'pi_test_123_abc-xyz_!@#';
      const payment = await repository.create(ctx, createValidPaymentIntent({
        providerPaymentId,
      }));

      expect(payment.providerPaymentId).toBe(providerPaymentId);
    });

    it('should handle metadata with only required fields', async () => {
      const metadata: PaymentMetadata = {
        buyerId: testBuyerId,
        sellerId: testSellerId,
        listingId: testListingId,
      };
      const payment = await repository.create(ctx, createValidPaymentIntent({ metadata }));

      expect(payment.metadata.buyerId).toBe(testBuyerId);
      expect(payment.metadata.sellerId).toBe(testSellerId);
      expect(payment.metadata.listingId).toBe(testListingId);
      expect(payment.metadata.eventName).toBeUndefined();
      expect(payment.metadata.ticketDescription).toBeUndefined();
    });

    it('should handle metadata with long strings', async () => {
      const longString = 'A'.repeat(500);
      const metadata: PaymentMetadata = {
        buyerId: testBuyerId,
        sellerId: testSellerId,
        listingId: testListingId,
        eventName: longString,
        ticketDescription: longString,
      };
      const payment = await repository.create(ctx, createValidPaymentIntent({ metadata }));

      expect(payment.metadata.eventName).toBe(longString);
      expect(payment.metadata.ticketDescription).toBe(longString);
    });

    it('should update refunded status correctly (maps to succeeded in DB)', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());

      const updated = await repository.update(ctx, payment.id, {
        status: PaymentStatus.Refunded,
      });

      expect(updated?.status).toBe(PaymentStatus.Succeeded);
    });
  });

  // ==================== Concurrent Operations ====================

  describe('Concurrent Operations', () => {
    it('should handle creating multiple payments for different transactions', async () => {
      const transaction2Id = await createTestTransaction();
      const transaction3Id = await createTestTransaction();

      const [payment1, payment2, payment3] = await Promise.all([
        repository.create(ctx, createValidPaymentIntent({ transactionId: testTransactionId })),
        repository.create(ctx, createValidPaymentIntent({ transactionId: transaction2Id })),
        repository.create(ctx, createValidPaymentIntent({ transactionId: transaction3Id })),
      ]);

      expect(payment1.transactionId).toBe(testTransactionId);
      expect(payment2.transactionId).toBe(transaction2Id);
      expect(payment3.transactionId).toBe(transaction3Id);
    });

    it('should handle concurrent reads', async () => {
      const payment = await repository.create(ctx, createValidPaymentIntent());

      const [found1, found2, found3] = await Promise.all([
        repository.findById(ctx, payment.id),
        repository.findByTransactionId(ctx, testTransactionId),
        repository.findById(ctx, payment.id),
      ]);

      expect(found1?.id).toBe(payment.id);
      expect(found2?.id).toBe(payment.id);
      expect(found3?.id).toBe(payment.id);
    });
  });
});
