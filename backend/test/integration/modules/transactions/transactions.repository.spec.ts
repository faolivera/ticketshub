import {
  PrismaClient,
  Role,
  SeatingType as PrismaSeatingType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { TransactionsRepository } from '@/modules/transactions/transactions.repository';
import {
  TransactionStatus,
  RequiredActor,
  CancellationReason,
} from '@/modules/transactions/transactions.domain';
import type {
  Transaction,
  Money,
} from '@/modules/transactions/transactions.domain';
import { TicketType, DeliveryMethod } from '@/modules/tickets/tickets.domain';
import type { Address } from '@/modules/shared/address.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';
import { OptimisticLockException } from '@/common/exceptions/optimistic-lock.exception';

describe('TransactionsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: TransactionsRepository;
  let ctx: Ctx;

  let testBuyerId: string;
  let testSellerId: string;
  let testListingId: string;
  let testEventId: string;
  let testEventDateId: string;
  let testEventSectionId: string;
  let testPricingSnapshotId: string;

  const createMoney = (amount: number, currency: string = 'EUR'): Money => ({
    amount,
    currency: currency as Money['currency'],
  });

  const createTestAddress = (overrides?: Partial<Address>): Address => ({
    line1: '123 Main St',
    city: 'Berlin',
    countryCode: 'DE',
    state: 'Berlin',
    postalCode: '10115',
    ...overrides,
  });

  const createTestUser = async (
    overrides?: Partial<{
      email: string;
      role: Role;
      acceptedSellerTermsAt: Date | null;
    }>,
  ): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email:
          overrides?.email ?? `user-${Date.now()}-${randomUUID()}@test.com`,
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
    const slug = `test-event-${randomUUID().slice(0, 8)}`;
    const event = await prisma.event.create({
      data: {
        slug,
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

  const createTestEventDate = async (
    eventId: string,
    createdBy: string,
  ): Promise<string> => {
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

  const createTestEventSection = async (
    eventId: string,
    createdBy: string,
  ): Promise<string> => {
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

  const createTestPricingSnapshot = async (
    listingId: string,
  ): Promise<string> => {
    const id = randomUUID();
    await prisma.pricingSnapshot.create({
      data: {
        id,
        listingId,
        pricePerTicket: { amount: 5000, currency: 'EUR' },
        buyerPlatformFeePercentage: 5,
        sellerPlatformFeePercentage: 10,
        paymentMethodCommissions: { card: 2.5, transfer: 0 },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    return id;
  };

  const createValidTransaction = (
    overrides?: Partial<Transaction>,
  ): Transaction => {
    const now = new Date();
    return {
      id: randomUUID(),
      listingId: testListingId,
      buyerId: testBuyerId,
      sellerId: testSellerId,
      ticketType: TicketType.Physical,
      ticketUnitIds: [],
      quantity: 2,
      ticketPrice: createMoney(10000),
      buyerPlatformFee: createMoney(500),
      sellerPlatformFee: createMoney(1000),
      paymentMethodCommission: createMoney(250),
      totalPaid: createMoney(10750),
      sellerReceives: createMoney(9000),
      pricingSnapshotId: testPricingSnapshotId,
      status: TransactionStatus.PendingPayment,
      requiredActor: RequiredActor.Buyer,
      paymentExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      version: 1,
      ...overrides,
    };
  };

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new TransactionsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();

    testBuyerId = await createTestUser({
      email: `buyer-${Date.now()}@test.com`,
    });
    testSellerId = await createTestUser({
      email: `seller-${Date.now()}@test.com`,
    });
    testEventId = await createTestEvent(testSellerId);
    testEventDateId = await createTestEventDate(testEventId, testSellerId);
    testEventSectionId = await createTestEventSection(
      testEventId,
      testSellerId,
    );
    testListingId = await createTestListing(testSellerId);
    testPricingSnapshotId = await createTestPricingSnapshot(testListingId);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==================== create ====================

  describe('create', () => {
    it('should create a new transaction', async () => {
      const transactionData = createValidTransaction();

      const transaction = await repository.create(ctx, transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.id).toBe(transactionData.id);
      expect(transaction.buyerId).toBe(testBuyerId);
      expect(transaction.sellerId).toBe(testSellerId);
      expect(transaction.status).toBe(TransactionStatus.PendingPayment);
      expect(transaction.requiredActor).toBe(RequiredActor.Buyer);
    });

    it('should create a transaction with all pricing fields', async () => {
      const transactionData = createValidTransaction();

      const transaction = await repository.create(ctx, transactionData);

      expect(transaction.ticketPrice).toEqual(transactionData.ticketPrice);
      expect(transaction.buyerPlatformFee).toEqual(
        transactionData.buyerPlatformFee,
      );
      expect(transaction.sellerPlatformFee).toEqual(
        transactionData.sellerPlatformFee,
      );
      expect(transaction.paymentMethodCommission).toEqual(
        transactionData.paymentMethodCommission,
      );
      expect(transaction.totalPaid).toEqual(transactionData.totalPaid);
      expect(transaction.sellerReceives).toEqual(
        transactionData.sellerReceives,
      );
    });

    it('should create a transaction with delivery method and pickup address', async () => {
      const pickupAddress = createTestAddress();
      const transactionData = createValidTransaction({
        deliveryMethod: DeliveryMethod.Pickup,
        pickupAddress,
      });

      const transaction = await repository.create(ctx, transactionData);

      expect(transaction.deliveryMethod).toBe(DeliveryMethod.Pickup);
      expect(transaction.pickupAddress).toEqual(pickupAddress);
    });

    it('should create a transaction with cancellation info', async () => {
      const transactionData = createValidTransaction({
        status: TransactionStatus.Cancelled,
        requiredActor: RequiredActor.None,
        cancelledBy: RequiredActor.Buyer,
        cancellationReason: CancellationReason.BuyerCancelled,
        cancelledAt: new Date(),
      });

      const transaction = await repository.create(ctx, transactionData);

      expect(transaction.status).toBe(TransactionStatus.Cancelled);
      expect(transaction.cancelledBy).toBe(RequiredActor.Buyer);
      expect(transaction.cancellationReason).toBe(
        CancellationReason.BuyerCancelled,
      );
      expect(transaction.cancelledAt).toBeDefined();
    });
  });

  // ==================== findById ====================

  describe('findById', () => {
    it('should return undefined when transaction does not exist', async () => {
      const transaction = await repository.findById(ctx, 'non-existent-id');
      expect(transaction).toBeUndefined();
    });

    it('should find transaction by id', async () => {
      const created = await repository.create(ctx, createValidTransaction());

      const found = await repository.findById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.buyerId).toBe(testBuyerId);
    });
  });

  // ==================== getAll ====================

  describe('getAll', () => {
    it('should return empty array when no transactions exist', async () => {
      const transactions = await repository.getAll(ctx);
      expect(transactions).toEqual([]);
    });

    it('should return all transactions ordered by createdAt desc', async () => {
      const t1 = await repository.create(ctx, createValidTransaction());
      const t2 = await repository.create(ctx, createValidTransaction());

      const transactions = await repository.getAll(ctx);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].id).toBe(t2.id);
      expect(transactions[1].id).toBe(t1.id);
    });
  });

  // ==================== getByBuyerId ====================

  describe('getByBuyerId', () => {
    it('should return empty array when buyer has no transactions', async () => {
      const transactions = await repository.getByBuyerId(ctx, testBuyerId);
      expect(transactions).toEqual([]);
    });

    it('should return transactions for specific buyer', async () => {
      const otherBuyerId = await createTestUser({
        email: `other-buyer-${Date.now()}@test.com`,
      });
      await repository.create(
        ctx,
        createValidTransaction({ buyerId: testBuyerId }),
      );
      await repository.create(
        ctx,
        createValidTransaction({ buyerId: otherBuyerId }),
      );

      const transactions = await repository.getByBuyerId(ctx, testBuyerId);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].buyerId).toBe(testBuyerId);
    });

    it('should return transactions ordered by createdAt desc', async () => {
      await repository.create(ctx, createValidTransaction());
      await repository.create(ctx, createValidTransaction());

      const transactions = await repository.getByBuyerId(ctx, testBuyerId);

      expect(transactions).toHaveLength(2);
      expect(transactions[0].createdAt >= transactions[1].createdAt).toBe(true);
    });
  });

  // ==================== getBySellerId ====================

  describe('getBySellerId', () => {
    it('should return empty array when seller has no transactions', async () => {
      const transactions = await repository.getBySellerId(ctx, testSellerId);
      expect(transactions).toEqual([]);
    });

    it('should return transactions for specific seller', async () => {
      const otherSellerId = await createTestUser({
        email: `other-seller-${Date.now()}@test.com`,
      });
      const otherEventId = await createTestEvent(otherSellerId);
      const otherEventDateId = await createTestEventDate(
        otherEventId,
        otherSellerId,
      );
      const otherEventSectionId = await createTestEventSection(
        otherEventId,
        otherSellerId,
      );

      const otherListing = await prisma.ticketListing.create({
        data: {
          seller: { connect: { id: otherSellerId } },
          event: { connect: { id: otherEventId } },
          eventDate: { connect: { id: otherEventDateId } },
          eventSection: { connect: { id: otherEventSectionId } },
          type: 'Physical',
          sellTogether: false,
          pricePerTicket: { amount: 5000, currency: 'EUR' },
          status: 'Active',
        },
      });

      const otherPricingSnapshot = await createTestPricingSnapshot(
        otherListing.id,
      );

      await repository.create(
        ctx,
        createValidTransaction({ sellerId: testSellerId }),
      );
      await repository.create(
        ctx,
        createValidTransaction({
          sellerId: otherSellerId,
          listingId: otherListing.id,
          pricingSnapshotId: otherPricingSnapshot,
        }),
      );

      const transactions = await repository.getBySellerId(ctx, testSellerId);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].sellerId).toBe(testSellerId);
    });
  });

  // ==================== getByListingId ====================

  describe('getByListingId', () => {
    it('should return empty array when listing has no transactions', async () => {
      const transactions = await repository.getByListingId(ctx, testListingId);
      expect(transactions).toEqual([]);
    });

    it('should return transactions for specific listing', async () => {
      await repository.create(ctx, createValidTransaction());
      await repository.create(ctx, createValidTransaction());

      const transactions = await repository.getByListingId(ctx, testListingId);

      expect(transactions).toHaveLength(2);
      expect(transactions.every((t) => t.listingId === testListingId)).toBe(
        true,
      );
    });
  });

  // ==================== getByListingIds ====================

  describe('getByListingIds', () => {
    it('should return empty array when no listing ids provided', async () => {
      const transactions = await repository.getByListingIds(ctx, []);
      expect(transactions).toEqual([]);
    });

    it('should return empty array when listings have no transactions', async () => {
      const transactions = await repository.getByListingIds(ctx, [
        'non-existent-1',
        'non-existent-2',
      ]);
      expect(transactions).toEqual([]);
    });

    it('should return transactions for multiple listings', async () => {
      const listing2Id = await createTestListing(testSellerId);
      const pricingSnapshot2Id = await createTestPricingSnapshot(listing2Id);

      await repository.create(
        ctx,
        createValidTransaction({ listingId: testListingId }),
      );
      await repository.create(
        ctx,
        createValidTransaction({
          listingId: listing2Id,
          pricingSnapshotId: pricingSnapshot2Id,
        }),
      );

      const transactions = await repository.getByListingIds(ctx, [
        testListingId,
        listing2Id,
      ]);

      expect(transactions).toHaveLength(2);
    });
  });

  // ==================== getPendingDepositRelease ====================

  describe('getPendingDepositRelease', () => {
    it('should return empty array when no transactions have depositReleaseAt passed', async () => {
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.TicketTransferred,
          depositReleaseAt: new Date(Date.now() + 60 * 60 * 1000),
        }),
      );

      const transactions = await repository.getPendingDepositRelease(ctx);

      expect(transactions).toEqual([]);
    });

    it('should return TicketTransferred transactions with expired depositReleaseAt', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.TicketTransferred,
          depositReleaseAt: pastDate,
        }),
      );

      const transactions = await repository.getPendingDepositRelease(ctx);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].status).toBe(TransactionStatus.TicketTransferred);
    });

    it('should return DepositHold transactions with expired depositReleaseAt', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.DepositHold,
          depositReleaseAt: pastDate,
        }),
      );

      const transactions = await repository.getPendingDepositRelease(ctx);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].status).toBe(TransactionStatus.DepositHold);
    });

    it('should not return TransferringFund or Completed', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.TransferringFund,
          depositReleaseAt: pastDate,
        }),
      );
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.Completed,
          depositReleaseAt: pastDate,
        }),
      );

      const transactions = await repository.getPendingDepositRelease(ctx);

      expect(transactions).toHaveLength(0);
    });
  });

  // ==================== update ====================

  describe('update', () => {
    it('should return undefined for non-existent transaction', async () => {
      const result = await repository.update(ctx, 'non-existent-id', {
        quantity: 5,
      });
      expect(result).toBeUndefined();
    });

    it('should update transaction status', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction(),
      );

      const updated = await repository.update(ctx, transaction.id, {
        status: TransactionStatus.PaymentReceived,
        requiredActor: RequiredActor.Seller,
        paymentReceivedAt: new Date(),
      });

      expect(updated?.status).toBe(TransactionStatus.PaymentReceived);
      expect(updated?.requiredActor).toBe(RequiredActor.Seller);
      expect(updated?.paymentReceivedAt).toBeDefined();
    });

    it('should update transaction to completed', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.TicketTransferred,
        }),
      );
      const completedAt = new Date();

      const updated = await repository.update(ctx, transaction.id, {
        status: TransactionStatus.Completed,
        requiredActor: RequiredActor.None,
        completedAt,
        buyerConfirmedAt: completedAt,
      });

      expect(updated?.status).toBe(TransactionStatus.Completed);
      expect(updated?.completedAt).toEqual(completedAt);
      expect(updated?.buyerConfirmedAt).toEqual(completedAt);
    });

    it('should update payment method and confirmation', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction(),
      );

      const updated = await repository.update(ctx, transaction.id, {
        paymentMethodId: 'payment-method-123',
        paymentConfirmationId: 'confirmation-456',
      });

      expect(updated?.paymentMethodId).toBe('payment-method-123');
      expect(updated?.paymentConfirmationId).toBe('confirmation-456');
    });

    it('should update delivery method and pickup address', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction(),
      );
      const pickupAddress = createTestAddress({
        line1: '456 New St',
        city: 'Munich',
        state: 'Bavaria',
        postalCode: '80331',
      });

      const updated = await repository.update(ctx, transaction.id, {
        deliveryMethod: DeliveryMethod.Pickup,
        pickupAddress,
      });

      expect(updated?.deliveryMethod).toBe(DeliveryMethod.Pickup);
      expect(updated?.pickupAddress).toEqual(pickupAddress);
    });

    it('should not update fields when passed undefined', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction({
          deliveryMethod: DeliveryMethod.Pickup,
          pickupAddress: createTestAddress(),
        }),
      );

      const updated = await repository.update(ctx, transaction.id, {
        deliveryMethod: undefined,
        pickupAddress: undefined,
      });

      expect(updated?.deliveryMethod).toBe(DeliveryMethod.Pickup);
      expect(updated?.pickupAddress).toBeDefined();
    });
  });

  // ==================== getPaginated ====================

  describe('getPaginated', () => {
    it('should return paginated transactions', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.create(ctx, createValidTransaction());
      }

      const result = await repository.getPaginated(ctx, 1, 2);

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should return second page', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.create(ctx, createValidTransaction());
      }

      const result = await repository.getPaginated(ctx, 2, 2);

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should filter by transaction ids', async () => {
      const t1 = await repository.create(ctx, createValidTransaction());
      const t2 = await repository.create(ctx, createValidTransaction());
      await repository.create(ctx, createValidTransaction());

      const result = await repository.getPaginated(ctx, 1, 10, {
        transactionIds: [t1.id, t2.id],
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by buyer ids', async () => {
      const otherBuyerId = await createTestUser({
        email: `other-buyer-${Date.now()}@test.com`,
      });
      await repository.create(
        ctx,
        createValidTransaction({ buyerId: testBuyerId }),
      );
      await repository.create(
        ctx,
        createValidTransaction({ buyerId: otherBuyerId }),
      );

      const result = await repository.getPaginated(ctx, 1, 10, {
        buyerIds: [testBuyerId],
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].buyerId).toBe(testBuyerId);
    });

    it('should filter by seller ids', async () => {
      await repository.create(ctx, createValidTransaction());

      const result = await repository.getPaginated(ctx, 1, 10, {
        sellerIds: [testSellerId],
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].sellerId).toBe(testSellerId);
    });

    it('should combine filters with OR logic', async () => {
      const otherBuyerId = await createTestUser({
        email: `other-buyer-${Date.now()}@test.com`,
      });
      const t1 = await repository.create(
        ctx,
        createValidTransaction({ buyerId: testBuyerId }),
      );
      await repository.create(
        ctx,
        createValidTransaction({ buyerId: otherBuyerId }),
      );

      const result = await repository.getPaginated(ctx, 1, 10, {
        transactionIds: [t1.id],
        buyerIds: [otherBuyerId],
      });

      expect(result.transactions).toHaveLength(2);
    });
  });

  // ==================== findByIds ====================

  describe('findByIds', () => {
    it('should return empty array when no ids provided', async () => {
      const transactions = await repository.findByIds(ctx, []);
      expect(transactions).toEqual([]);
    });

    it('should return empty array when no transactions match', async () => {
      const transactions = await repository.findByIds(ctx, [
        'non-existent-1',
        'non-existent-2',
      ]);
      expect(transactions).toEqual([]);
    });

    it('should find multiple transactions by ids', async () => {
      const t1 = await repository.create(ctx, createValidTransaction());
      const t2 = await repository.create(ctx, createValidTransaction());
      await repository.create(ctx, createValidTransaction());

      const transactions = await repository.findByIds(ctx, [t1.id, t2.id]);

      expect(transactions).toHaveLength(2);
      expect(transactions.map((t) => t.id)).toContain(t1.id);
      expect(transactions.map((t) => t.id)).toContain(t2.id);
    });
  });

  // ==================== countByStatuses ====================

  describe('countByStatuses', () => {
    it('should return 0 when no statuses provided', async () => {
      const count = await repository.countByStatuses(ctx, []);
      expect(count).toBe(0);
    });

    it('should count transactions by single status', async () => {
      await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.PendingPayment }),
      );
      await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.PaymentReceived }),
      );
      await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.PendingPayment }),
      );

      const count = await repository.countByStatuses(ctx, [
        TransactionStatus.PendingPayment,
      ]);

      expect(count).toBe(2);
    });

    it('should count transactions by multiple statuses', async () => {
      await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.PendingPayment }),
      );
      await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.PaymentReceived }),
      );
      await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.Completed }),
      );

      const count = await repository.countByStatuses(ctx, [
        TransactionStatus.PendingPayment,
        TransactionStatus.PaymentReceived,
      ]);

      expect(count).toBe(2);
    });
  });

  // ==================== getIdsByStatuses ====================

  describe('getIdsByStatuses', () => {
    it('should return empty array when no statuses provided', async () => {
      const ids = await repository.getIdsByStatuses(ctx, []);
      expect(ids).toEqual([]);
    });

    it('should return transaction ids for given statuses', async () => {
      const t1 = await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.PendingPayment }),
      );
      const t2 = await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.PaymentReceived }),
      );
      await repository.create(
        ctx,
        createValidTransaction({ status: TransactionStatus.Completed }),
      );

      const ids = await repository.getIdsByStatuses(ctx, [
        TransactionStatus.PendingPayment,
        TransactionStatus.PaymentReceived,
      ]);

      expect(ids).toHaveLength(2);
      expect(ids).toContain(t1.id);
      expect(ids).toContain(t2.id);
    });
  });

  // ==================== findExpiredPendingPayments ====================

  describe('findExpiredPendingPayments', () => {
    it('should return empty array when no expired payments', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.PendingPayment,
          paymentExpiresAt: futureDate,
        }),
      );

      const transactions = await repository.findExpiredPendingPayments(ctx);

      expect(transactions).toEqual([]);
    });

    it('should return transactions with expired payment window', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.PendingPayment,
          paymentExpiresAt: pastDate,
        }),
      );

      const transactions = await repository.findExpiredPendingPayments(ctx);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].status).toBe(TransactionStatus.PendingPayment);
    });

    it('should not return non-PendingPayment transactions with expired dates', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.PaymentReceived,
          paymentExpiresAt: pastDate,
        }),
      );

      const transactions = await repository.findExpiredPendingPayments(ctx);

      expect(transactions).toEqual([]);
    });
  });

  // ==================== findExpiredAdminReviews ====================

  describe('findExpiredAdminReviews', () => {
    it('should return empty array when no expired admin reviews', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.PaymentPendingVerification,
          adminReviewExpiresAt: futureDate,
        }),
      );

      const transactions = await repository.findExpiredAdminReviews(ctx);

      expect(transactions).toEqual([]);
    });

    it('should return transactions with expired admin review', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.PaymentPendingVerification,
          adminReviewExpiresAt: pastDate,
        }),
      );

      const transactions = await repository.findExpiredAdminReviews(ctx);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].status).toBe(
        TransactionStatus.PaymentPendingVerification,
      );
    });

    it('should not return non-PaymentPendingVerification transactions', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000);
      await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.PendingPayment,
          adminReviewExpiresAt: pastDate,
        }),
      );

      const transactions = await repository.findExpiredAdminReviews(ctx);

      expect(transactions).toEqual([]);
    });
  });

  // ==================== findByIdForUpdate ====================

  describe('findByIdForUpdate', () => {
    it('should return undefined when transaction does not exist', async () => {
      const transaction = await repository.findByIdForUpdate(
        ctx,
        'non-existent-id',
      );
      expect(transaction).toBeUndefined();
    });

    it('should find transaction by id with lock', async () => {
      const created = await repository.create(ctx, createValidTransaction());

      const found = await repository.findByIdForUpdate(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  // ==================== updateWithVersion ====================

  describe('updateWithVersion', () => {
    it('should update transaction with correct version', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction(),
      );

      const updated = await repository.updateWithVersion(
        ctx,
        transaction.id,
        { status: TransactionStatus.PaymentReceived },
        1,
      );

      expect(updated.status).toBe(TransactionStatus.PaymentReceived);
      expect(updated.version).toBe(2);
    });

    it('should throw OptimisticLockException when version mismatch', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction(),
      );

      await expect(
        repository.updateWithVersion(
          ctx,
          transaction.id,
          { status: TransactionStatus.PaymentReceived },
          2,
        ),
      ).rejects.toThrow(OptimisticLockException);
    });

    it('should throw OptimisticLockException for non-existent transaction', async () => {
      await expect(
        repository.updateWithVersion(
          ctx,
          'non-existent-id',
          { status: TransactionStatus.PaymentReceived },
          1,
        ),
      ).rejects.toThrow(OptimisticLockException);
    });

    it('should increment version on each update', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction(),
      );

      const updated1 = await repository.updateWithVersion(
        ctx,
        transaction.id,
        { status: TransactionStatus.PaymentReceived },
        1,
      );

      expect(updated1.version).toBe(2);

      const updated2 = await repository.updateWithVersion(
        ctx,
        transaction.id,
        { status: TransactionStatus.TicketTransferred },
        2,
      );

      expect(updated2.version).toBe(3);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle transactions with all ticket types', async () => {
      const ticketTypes = [TicketType.Physical, TicketType.Digital];

      for (const ticketType of ticketTypes) {
        const transaction = await repository.create(
          ctx,
          createValidTransaction({ ticketType }),
        );
        expect(transaction.ticketType).toBe(ticketType);
      }
    });

    it('should handle transactions with all statuses', async () => {
      const statuses = [
        TransactionStatus.PendingPayment,
        TransactionStatus.PaymentPendingVerification,
        TransactionStatus.PaymentReceived,
        TransactionStatus.TicketTransferred,
        TransactionStatus.Completed,
        TransactionStatus.Disputed,
        TransactionStatus.Refunded,
        TransactionStatus.Cancelled,
      ];

      for (const status of statuses) {
        const transaction = await repository.create(
          ctx,
          createValidTransaction({
            status,
            requiredActor: RequiredActor.None,
          }),
        );
        expect(transaction.status).toBe(status);
      }
    });

    it('should handle all cancellation reasons', async () => {
      const reasons = [
        CancellationReason.BuyerCancelled,
        CancellationReason.PaymentFailed,
        CancellationReason.PaymentTimeout,
        CancellationReason.AdminRejected,
        CancellationReason.AdminReviewTimeout,
      ];

      for (const reason of reasons) {
        const transaction = await repository.create(
          ctx,
          createValidTransaction({
            status: TransactionStatus.Cancelled,
            cancellationReason: reason,
            cancelledBy: RequiredActor.Platform,
            cancelledAt: new Date(),
          }),
        );
        expect(transaction.cancellationReason).toBe(reason);
      }
    });

    it('should handle transaction with ticket unit ids', async () => {
      const ticketUnitIds = ['unit-1', 'unit-2', 'unit-3'];
      const transaction = await repository.create(
        ctx,
        createValidTransaction({
          ticketUnitIds,
          quantity: 3,
        }),
      );

      expect(transaction.ticketUnitIds).toEqual(ticketUnitIds);
    });

    it('should handle transaction with dispute id', async () => {
      const disputeId = randomUUID();
      const transaction = await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.Disputed,
          disputeId,
        }),
      );

      expect(transaction.disputeId).toBe(disputeId);
    });

    it('should handle transaction with admin approval', async () => {
      const adminId = await createTestUser({
        role: Role.Admin,
        email: `admin-${Date.now()}@test.com`,
      });
      const approvedAt = new Date();

      const transaction = await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.PaymentReceived,
          paymentApprovedBy: adminId,
          paymentApprovedAt: approvedAt,
        }),
      );

      expect(transaction.paymentApprovedBy).toBe(adminId);
      expect(transaction.paymentApprovedAt).toEqual(approvedAt);
    });

    it('should handle refunded transaction', async () => {
      const refundedAt = new Date();
      const transaction = await repository.create(
        ctx,
        createValidTransaction({
          status: TransactionStatus.Refunded,
          refundedAt,
        }),
      );

      expect(transaction.status).toBe(TransactionStatus.Refunded);
      expect(transaction.refundedAt).toEqual(refundedAt);
    });
  });

  // ==================== audit log ====================

  describe('audit log', () => {
    it('should create one audit log row with action "created" when transaction is created', async () => {
      const transactionData = createValidTransaction();
      await repository.create(ctx, transactionData);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: transactionData.id },
        orderBy: { changedAt: 'asc' },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('created');
      expect(auditLogs[0].transactionId).toBe(transactionData.id);
      expect(auditLogs[0].payload).toBeDefined();
      expect((auditLogs[0].payload as { id?: string }).id).toBe(
        transactionData.id,
      );
    });

    it('should set changedBy to ctx.userId when context has userId', async () => {
      const userId = testBuyerId;
      const ctxWithUser = createTestContext({ userId });
      const transactionData = createValidTransaction();
      await repository.create(ctxWithUser, transactionData);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: transactionData.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].changedBy).toBe(userId);
    });

    it('should set changedBy to "system" when ctx.userId is undefined', async () => {
      const ctxNoUser = createTestContext(); // no userId
      const transactionData = createValidTransaction();
      await repository.create(ctxNoUser, transactionData);

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: transactionData.id },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].changedBy).toBe('system');
    });

    it('should create one audit log row with action "updated" when transaction is updated', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction(),
      );
      await repository.update(ctx, transaction.id, {
        status: TransactionStatus.PaymentReceived,
        requiredActor: RequiredActor.Seller,
        paymentReceivedAt: new Date(),
      });

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: transaction.id },
        orderBy: { changedAt: 'asc' },
      });

      expect(auditLogs).toHaveLength(2); // created + updated
      expect(auditLogs[0].action).toBe('created');
      expect(auditLogs[1].action).toBe('updated');
      const payload = auditLogs[1].payload as Record<string, unknown>;
      expect(payload.status).toBeDefined();
      expect(payload.requiredActor).toBeDefined();
    });

    it('should create one audit log row with action "updated" when updateWithVersion is called', async () => {
      const transaction = await repository.create(
        ctx,
        createValidTransaction(),
      );
      await repository.updateWithVersion(
        ctx,
        transaction.id,
        {
          status: TransactionStatus.Cancelled,
          requiredActor: RequiredActor.None,
          cancelledBy: RequiredActor.Buyer,
          cancellationReason: CancellationReason.BuyerCancelled,
          cancelledAt: new Date(),
        },
        transaction.version,
      );

      const auditLogs = await prisma.transactionAuditLog.findMany({
        where: { transactionId: transaction.id },
        orderBy: { changedAt: 'asc' },
      });

      expect(auditLogs).toHaveLength(2); // created + updated
      expect(auditLogs[0].action).toBe('created');
      expect(auditLogs[1].action).toBe('updated');
      const payload = auditLogs[1].payload as Record<string, unknown>;
      expect(payload.status).toBeDefined();
    });
  });
});
