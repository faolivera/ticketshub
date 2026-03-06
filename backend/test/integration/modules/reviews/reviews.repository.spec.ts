import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ReviewsRepository } from '@/modules/reviews/reviews.repository';
import type { Review } from '@/modules/reviews/reviews.domain';
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

  describe('getAll', () => {
    it('should return empty array when no reviews', async () => {
      await truncateAllTables(prisma);
      await createTestTransaction();
      const all = await repository.getAll(ctx);
      expect(all).toEqual([]);
    });

    it('should return all reviews', async () => {
      await repository.create(ctx, createValidReview({ id: randomUUID() }));
      await repository.create(ctx, createValidReview({ id: randomUUID(), reviewerId: sellerId, revieweeId: buyerId, reviewerRole: 'seller', revieweeRole: 'buyer' }));
      const all = await repository.getAll(ctx);
      expect(all).toHaveLength(2);
    });
  });

  describe('findByTransactionAndReviewer', () => {
    it('should return undefined when no match', async () => {
      const otherUserId = await createTestUser();
      const found = await repository.findByTransactionAndReviewer(ctx, transactionId, otherUserId);
      expect(found).toBeUndefined();
    });

    it('should find review by transaction and reviewer', async () => {
      const created = await repository.create(ctx, createValidReview());
      const found = await repository.findByTransactionAndReviewer(ctx, transactionId, buyerId);
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
      await repository.create(ctx, createValidReview({ id: randomUUID(), reviewerId: sellerId, revieweeId: buyerId, reviewerRole: 'seller', revieweeRole: 'buyer' }));
      const list = await repository.getByTransactionId(ctx, transactionId);
      expect(list).toHaveLength(2);
    });
  });

  describe('getByRevieweeIdAndRole', () => {
    it('should return reviews for reviewee and role', async () => {
      await repository.create(ctx, createValidReview());
      const list = await repository.getByRevieweeIdAndRole(ctx, sellerId, 'seller');
      expect(list).toHaveLength(1);
      expect(list[0].revieweeId).toBe(sellerId);
    });

    it('should return empty when no matches', async () => {
      const list = await repository.getByRevieweeIdAndRole(ctx, buyerId, 'seller');
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
});
