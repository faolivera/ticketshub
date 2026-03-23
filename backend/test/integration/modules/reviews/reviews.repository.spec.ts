import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ReviewsRepository } from '@/modules/reviews/reviews.repository';
import type { Review, ReviewPartyRole } from '@/modules/reviews/reviews.domain';
import type { ReviewMetrics } from '@/modules/reviews/reviews.repository.interface';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('ReviewsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: ReviewsRepository;
  let ctx: Ctx;
  let buyerId: string;
  let sellerId: string;
  let transactionId: string;

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

  async function createTestTransaction(): Promise<string> {
    const [bId, sId] = [await createTestUser(), await createTestUser()];
    buyerId = bId;
    sellerId = sId;
    const event = await prisma.event.create({
      data: {
        slug: `test-event-${randomUUID().slice(0, 8)}`,
        name: 'E',
        category: 'Concert',
        venue: 'V',
        location: {},
        imageIds: [],
        status: 'approved',
        createdById: sId,
      },
    });
    const eventDate = await prisma.eventDate.create({
      data: {
        event: { connect: { id: event.id } },
        date: new Date(),
        status: 'approved',
        createdBy: { connect: { id: sId } },
      },
    });
    const eventSection = await prisma.eventSection.create({
      data: {
        event: { connect: { id: event.id } },
        name: 'S',
        seatingType: 'unnumbered',
        status: 'approved',
        createdBy: { connect: { id: sId } },
      },
    });
    const listing = await prisma.ticketListing.create({
      data: {
        event: { connect: { id: event.id } },
        eventDate: { connect: { id: eventDate.id } },
        eventSection: { connect: { id: eventSection.id } },
        seller: { connect: { id: sId } },
        type: 'Digital' as never,
        sellTogether: false,
        pricePerTicket: { amount: 1000, currency: 'EUR' },
        status: 'Active',
        version: 0,
      },
    });
    const snapshot = await prisma.pricingSnapshot.create({
      data: {
        id: randomUUID(),
        listingId: listing.id,
        pricePerTicket: { amount: 1000, currency: 'EUR' },
        buyerPlatformFeePercentage: 0,
        sellerPlatformFeePercentage: 0,
        paymentMethodCommissions: {},
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const unit = await prisma.ticketUnit.create({
      data: {
        listing: { connect: { id: listing.id } },
        status: 'sold',
      },
    });
    const tx = await prisma.transaction.create({
      data: {
        listingId: listing.id,
        buyerId: bId,
        sellerId: sId,
        ticketType: 'Digital' as never,
        ticketUnitIds: [unit.id],
        quantity: 1,
        ticketPrice: { amount: 1000, currency: 'EUR' },
        buyerPlatformFee: { amount: 0, currency: 'EUR' },
        sellerPlatformFee: { amount: 0, currency: 'EUR' },
        paymentMethodCommission: { amount: 0, currency: 'EUR' },
        totalPaid: { amount: 1000, currency: 'EUR' },
        sellerReceives: { amount: 1000, currency: 'EUR' },
        pricingSnapshotId: snapshot.id,
        status: 'Completed',
        paymentExpiresAt: new Date(Date.now() + 3600000),
        completedAt: new Date(),
        version: 0,
      },
    });
    transactionId = tx.id;
    return tx.id;
  }

  const createValidReview = (overrides?: Partial<Review>): Review => ({
    id: randomUUID(),
    transactionId,
    buyerId,
    sellerId,
    reviewerId: buyerId,
    reviewerRole: 'buyer',
    revieweeId: sellerId,
    revieweeRole: 'seller',
    rating: 'positive',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new ReviewsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
    await createTestTransaction();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  describe('create', () => {
    it('should create a review', async () => {
      const review = createValidReview();

      const created = await repository.create(ctx, review);

      expect(created.id).toBe(review.id);
      expect(created.transactionId).toBe(transactionId);
      expect(created.rating).toBe('positive');
    });

    it('should store all rating types', async () => {
      for (const rating of ['positive', 'neutral', 'negative'] as const) {
        const txId = await createTestTransaction();
        const review = createValidReview({
          id: randomUUID(),
          transactionId: txId,
          rating,
        });
        const created = await repository.create(ctx, review);
        expect(created.rating).toBe(rating);
      }
    });
  });

  describe('findById', () => {
    it('should return undefined when not found', async () => {
      const found = await repository.findById(ctx, 'non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should find review by id', async () => {
      const created = await repository.create(ctx, createValidReview());
      const found = await repository.findById(ctx, created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('findByTransactionAndReviewer', () => {
    it('should return undefined when no match', async () => {
      const otherUserId = await createTestUser();
      const found = await repository.findByTransactionAndReviewer(
        ctx,
        transactionId,
        otherUserId,
      );
      expect(found).toBeUndefined();
    });

    it('should find review by transaction and reviewer', async () => {
      const created = await repository.create(ctx, createValidReview());
      const found = await repository.findByTransactionAndReviewer(
        ctx,
        transactionId,
        buyerId,
      );
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('getByTransactionId', () => {
    it('should return empty array when no reviews for transaction', async () => {
      const list = await repository.getByTransactionId(ctx, transactionId);
      expect(list).toEqual([]);
    });

    it('should return all reviews for transaction', async () => {
      await repository.create(ctx, createValidReview({ id: randomUUID() }));
      await repository.create(
        ctx,
        createValidReview({
          id: randomUUID(),
          reviewerId: sellerId,
          revieweeId: buyerId,
          reviewerRole: 'seller',
          revieweeRole: 'buyer',
        }),
      );
      const list = await repository.getByTransactionId(ctx, transactionId);
      expect(list).toHaveLength(2);
    });
  });

  describe('getByRevieweeIdAndRole', () => {
    it('should return reviews for reviewee and role', async () => {
      await repository.create(ctx, createValidReview());
      const list = await repository.getByRevieweeIdAndRole(
        ctx,
        sellerId,
        'seller',
      );
      expect(list).toHaveLength(1);
      expect(list[0].revieweeId).toBe(sellerId);
    });

    it('should return empty when no matches', async () => {
      const list = await repository.getByRevieweeIdAndRole(
        ctx,
        buyerId,
        'seller',
      );
      expect(list).toEqual([]);
    });
  });

  describe('getByReviewerId', () => {
    it('should return reviews by reviewer', async () => {
      await repository.create(ctx, createValidReview());
      const list = await repository.getByReviewerId(ctx, buyerId);
      expect(list).toHaveLength(1);
      expect(list[0].reviewerId).toBe(buyerId);
    });
  });

  // ==================== getMetricsByRevieweeIdAndRole (consistency with getByRevieweeIdAndRole) ====================

  describe('getMetricsByRevieweeIdAndRole (consistency with getByRevieweeIdAndRole)', () => {
    // CONSISTENCY INVARIANT:
    // `getMetricsByRevieweeIdAndRole` and `getByRevieweeIdAndRole` MUST agree on count and rating values.
    // If the ReviewRole enum mapping (domain -> DB) changes, BOTH methods are affected.
    // If a new review type or rating range is introduced, verify both methods handle it consistently.

    // Helper: create a new transaction directly via prisma reusing existing seller/buyer, so the outer
    // `sellerId` / `buyerId` variables are not clobbered (createTestTransaction() overwrites them).
    async function createExtraTransaction(
      forSellerId: string,
      forBuyerId: string,
    ): Promise<string> {
      const event = await prisma.event.create({
        data: {
          slug: `test-event-${randomUUID().slice(0, 8)}`,
          name: 'E',
          category: 'Concert',
          venue: 'V',
          location: {},
          imageIds: [],
          status: 'approved',
          createdById: forSellerId,
        },
      });
      const eventDate = await prisma.eventDate.create({
        data: {
          event: { connect: { id: event.id } },
          date: new Date(),
          status: 'approved',
          createdBy: { connect: { id: forSellerId } },
        },
      });
      const eventSection = await prisma.eventSection.create({
        data: {
          event: { connect: { id: event.id } },
          name: 'S',
          seatingType: 'unnumbered',
          status: 'approved',
          createdBy: { connect: { id: forSellerId } },
        },
      });
      const listing = await prisma.ticketListing.create({
        data: {
          event: { connect: { id: event.id } },
          eventDate: { connect: { id: eventDate.id } },
          eventSection: { connect: { id: eventSection.id } },
          seller: { connect: { id: forSellerId } },
          type: 'Digital' as never,
          sellTogether: false,
          pricePerTicket: { amount: 1000, currency: 'EUR' },
          status: 'Active',
          version: 0,
        },
      });
      const snapshot = await prisma.pricingSnapshot.create({
        data: {
          id: randomUUID(),
          listingId: listing.id,
          pricePerTicket: { amount: 1000, currency: 'EUR' },
          buyerPlatformFeePercentage: 0,
          sellerPlatformFeePercentage: 0,
          paymentMethodCommissions: {},
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      const unit = await prisma.ticketUnit.create({
        data: {
          listing: { connect: { id: listing.id } },
          status: 'sold',
        },
      });
      const tx = await prisma.transaction.create({
        data: {
          listingId: listing.id,
          buyerId: forBuyerId,
          sellerId: forSellerId,
          ticketType: 'Digital' as never,
          ticketUnitIds: [unit.id],
          quantity: 1,
          ticketPrice: { amount: 1000, currency: 'EUR' },
          buyerPlatformFee: { amount: 0, currency: 'EUR' },
          sellerPlatformFee: { amount: 0, currency: 'EUR' },
          paymentMethodCommission: { amount: 0, currency: 'EUR' },
          totalPaid: { amount: 1000, currency: 'EUR' },
          sellerReceives: { amount: 1000, currency: 'EUR' },
          pricingSnapshotId: snapshot.id,
          status: 'Completed',
          paymentExpiresAt: new Date(Date.now() + 3600000),
          completedAt: new Date(),
          version: 0,
        },
      });
      return tx.id;
    }

    it('count matches: aggregate count equals fetch array length', async () => {
      // Capture stable seller/buyer from beforeEach setup
      const stableSellerId = sellerId;
      const stableBuyerId = buyerId;
      // The beforeEach already created 1 transaction; create 3 more for the same seller
      const ratings: Array<Review['rating']> = ['positive', 'negative', 'neutral'];
      const txIds: string[] = [transactionId];
      for (const _rating of ratings) {
        const txId = await createExtraTransaction(stableSellerId, stableBuyerId);
        txIds.push(txId);
      }

      // Insert 4 reviews (positive, positive, negative, neutral) for stableSellerId
      const reviewRatings: Array<Review['rating']> = ['positive', 'positive', 'negative', 'neutral'];
      for (let i = 0; i < reviewRatings.length; i++) {
        await repository.create(
          ctx,
          createValidReview({
            id: randomUUID(),
            transactionId: txIds[i],
            buyerId: stableBuyerId,
            sellerId: stableSellerId,
            reviewerId: stableBuyerId,
            revieweeId: stableSellerId,
            revieweeRole: 'seller',
            reviewerRole: 'buyer',
            rating: reviewRatings[i],
          }),
        );
      }

      const metrics: ReviewMetrics = await repository.getMetricsByRevieweeIdAndRole(
        ctx,
        stableSellerId,
        'seller' as ReviewPartyRole,
      );
      const list = await repository.getByRevieweeIdAndRole(ctx, stableSellerId, 'seller' as ReviewPartyRole, 100);

      expect(metrics.count).toBe(4);
      expect(list).toHaveLength(4);
    });

    it('avgRating matches: aggregate average equals manually computed average from fetch', async () => {
      // Ratings: positive(1), positive(1), negative(-1), neutral(0). Sum = 1, avg = 0.25
      const stableSellerId = sellerId;
      const stableBuyerId = buyerId;
      const extraTxIds: string[] = [transactionId];
      for (let i = 0; i < 3; i++) {
        extraTxIds.push(await createExtraTransaction(stableSellerId, stableBuyerId));
      }

      const reviewRatings: Array<Review['rating']> = ['positive', 'positive', 'negative', 'neutral'];
      for (let i = 0; i < reviewRatings.length; i++) {
        await repository.create(
          ctx,
          createValidReview({
            id: randomUUID(),
            transactionId: extraTxIds[i],
            buyerId: stableBuyerId,
            sellerId: stableSellerId,
            reviewerId: stableBuyerId,
            revieweeId: stableSellerId,
            revieweeRole: 'seller',
            reviewerRole: 'buyer',
            rating: reviewRatings[i],
          }),
        );
      }

      const metrics: ReviewMetrics = await repository.getMetricsByRevieweeIdAndRole(
        ctx,
        stableSellerId,
        'seller' as ReviewPartyRole,
      );
      const list = await repository.getByRevieweeIdAndRole(ctx, stableSellerId, 'seller' as ReviewPartyRole, 100);

      // Map domain ratings back to numeric values to compute average manually
      const ratingToNum = (r: Review['rating']): number => {
        if (r === 'positive') return 1;
        if (r === 'negative') return -1;
        return 0;
      };
      const manualAvg = list.reduce((sum, r) => sum + ratingToNum(r.rating), 0) / list.length;

      expect(metrics.avgRating).toBeCloseTo(0.25, 2);
      expect(manualAvg).toBeCloseTo(0.25, 2);
      expect(metrics.avgRating!).toBeCloseTo(manualAvg, 2);
    });

    it('role filter is consistent: metrics and fetch both respect revieweeRole filter', async () => {
      // Seed 2 seller reviews (buyerId reviews sellerId-as-seller)
      // and 3 buyer reviews (sellerId reviews buyerId-as-buyer) for distinct roles on the same user pair.
      const stableSellerId = sellerId;
      const stableBuyerId = buyerId;

      // Create 1 extra transaction (we already have transactionId from beforeEach)
      const tx2 = await createExtraTransaction(stableSellerId, stableBuyerId);

      // 2 seller reviews: reviewee is stableSellerId, role=seller
      await repository.create(ctx, createValidReview({
        id: randomUUID(),
        transactionId,
        buyerId: stableBuyerId,
        sellerId: stableSellerId,
        reviewerId: stableBuyerId,
        reviewerRole: 'buyer',
        revieweeId: stableSellerId,
        revieweeRole: 'seller',
        rating: 'positive',
      }));
      await repository.create(ctx, createValidReview({
        id: randomUUID(),
        transactionId: tx2,
        buyerId: stableBuyerId,
        sellerId: stableSellerId,
        reviewerId: stableBuyerId,
        reviewerRole: 'buyer',
        revieweeId: stableSellerId,
        revieweeRole: 'seller',
        rating: 'positive',
      }));

      // Create 3 more transactions where stableSellerId is the buyer and some other user is seller
      const altSeller1 = await createTestUser();
      const altSeller2 = await createTestUser();
      const altSeller3 = await createTestUser();

      const makeTxForAltSeller = async (altSellerId: string): Promise<string> =>
        createExtraTransaction(altSellerId, stableSellerId);

      const tx3 = await makeTxForAltSeller(altSeller1);
      const tx4 = await makeTxForAltSeller(altSeller2);
      const tx5 = await makeTxForAltSeller(altSeller3);

      // 3 buyer reviews: reviewee is stableSellerId (acting as buyer), role=buyer
      for (const [txId, altSellerId] of [[tx3, altSeller1], [tx4, altSeller2], [tx5, altSeller3]] as const) {
        await repository.create(ctx, createValidReview({
          id: randomUUID(),
          transactionId: txId,
          buyerId: stableSellerId,
          sellerId: altSellerId,
          reviewerId: altSellerId,
          reviewerRole: 'seller',
          revieweeId: stableSellerId,
          revieweeRole: 'buyer',
          rating: 'positive',
        }));
      }

      const sellerMetrics: ReviewMetrics = await repository.getMetricsByRevieweeIdAndRole(
        ctx,
        stableSellerId,
        'seller' as ReviewPartyRole,
      );
      const sellerList = await repository.getByRevieweeIdAndRole(ctx, stableSellerId, 'seller' as ReviewPartyRole, 100);

      const buyerMetrics: ReviewMetrics = await repository.getMetricsByRevieweeIdAndRole(
        ctx,
        stableSellerId,
        'buyer' as ReviewPartyRole,
      );
      const buyerList = await repository.getByRevieweeIdAndRole(ctx, stableSellerId, 'buyer' as ReviewPartyRole, 100);

      expect(sellerMetrics.count).toBe(2);
      expect(sellerList).toHaveLength(2);

      expect(buyerMetrics.count).toBe(3);
      expect(buyerList).toHaveLength(3);
    });
  });
});
