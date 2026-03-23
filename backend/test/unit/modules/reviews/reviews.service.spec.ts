import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from '../../../../src/modules/reviews/reviews.service';
import { REVIEWS_REPOSITORY } from '../../../../src/modules/reviews/reviews.repository.interface';
import type { IReviewsRepository } from '../../../../src/modules/reviews/reviews.repository.interface';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { NotificationsService } from '../../../../src/modules/notifications/notifications.service';
import {
  TransactionStatus,
  RequiredActor,
} from '../../../../src/modules/transactions/transactions.domain';
import { TicketType } from '../../../../src/modules/tickets/tickets.domain';
import type { Review } from '../../../../src/modules/reviews/reviews.domain';
import type { Transaction } from '../../../../src/modules/transactions/transactions.domain';
import type { Ctx } from '../../../../src/common/types/context';
describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewsRepository: jest.Mocked<IReviewsRepository>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let usersService: jest.Mocked<UsersService>;
  let ticketsService: jest.Mocked<TicketsService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockTransaction: Transaction = {
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketType: TicketType.Digital,
    ticketUnitIds: ['unit_1'],
    quantity: 1,
    ticketPrice: { amount: 10000, currency: 'USD' },
    buyerPlatformFee: { amount: 1000, currency: 'USD' },
    sellerPlatformFee: { amount: 500, currency: 'USD' },
    paymentMethodCommission: { amount: 1200, currency: 'USD' },
    totalPaid: { amount: 12200, currency: 'USD' },
    sellerReceives: { amount: 9500, currency: 'USD' },
    pricingSnapshotId: 'ps_123',
    status: TransactionStatus.Completed,
    requiredActor: RequiredActor.None,
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    version: 1,
  };

  const mockReview: Review = {
    id: 'rev_123',
    transactionId: 'txn_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    reviewerId: 'buyer_123',
    reviewerRole: 'buyer',
    revieweeId: 'seller_123',
    revieweeRole: 'seller',
    rating: 'positive',
    comment: 'Great transaction!',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockReviewsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTransactionAndReviewer: jest.fn(),
      getByTransactionId: jest.fn(),
      getByRevieweeIdAndRole: jest.fn(),
      getByRevieweeIdsAndRole: jest.fn(),
      getByReviewerId: jest.fn(),
      getMetricsByRevieweeIdAndRole: jest.fn(),
    };

    const mockTransactionsService = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      getSellerCompletedSalesTotal: jest.fn(),
      getCompletedSalesTotalBatch: jest.fn(),
      getBuyerCompletedPurchasesTotal: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      getPublicUserInfoByIds: jest.fn(),
    };

    const mockTicketsService = {
      getListingById: jest.fn(),
      getListingsByIds: jest.fn(),
    };

    const mockNotificationsService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: REVIEWS_REPOSITORY, useValue: mockReviewsRepository },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    reviewsRepository = module.get(REVIEWS_REPOSITORY);
    transactionsService = module.get(TransactionsService);
    usersService = module.get(UsersService);
    ticketsService = module.get(TicketsService);
  });

  describe('createReview', () => {
    it('should create a review successfully when buyer reviews a completed transaction', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      reviewsRepository.findByTransactionAndReviewer.mockResolvedValue(
        undefined,
      );
      reviewsRepository.create.mockResolvedValue(undefined);

      const result = await service.createReview(mockCtx, 'buyer_123', {
        transactionId: 'txn_123',
        rating: 'positive',
        comment: 'Great!',
      });

      expect(result).toBeDefined();
      expect(result.transactionId).toBe('txn_123');
      expect(result.reviewerId).toBe('buyer_123');
      expect(result.reviewerRole).toBe('buyer');
      expect(result.revieweeId).toBe('seller_123');
      expect(result.revieweeRole).toBe('seller');
      expect(result.rating).toBe('positive');
      expect(reviewsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should create a review successfully when seller reviews a completed transaction', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      reviewsRepository.findByTransactionAndReviewer.mockResolvedValue(
        undefined,
      );
      reviewsRepository.create.mockResolvedValue(undefined);

      const result = await service.createReview(mockCtx, 'seller_123', {
        transactionId: 'txn_123',
        rating: 'neutral',
      });

      expect(result).toBeDefined();
      expect(result.reviewerId).toBe('seller_123');
      expect(result.reviewerRole).toBe('seller');
      expect(result.revieweeId).toBe('buyer_123');
      expect(result.revieweeRole).toBe('buyer');
      expect(result.rating).toBe('neutral');
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      transactionsService.findById.mockResolvedValue(undefined);

      await expect(
        service.createReview(mockCtx, 'buyer_123', {
          transactionId: 'nonexistent',
          rating: 'positive',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transaction is not completed', async () => {
      const pendingTransaction = {
        ...mockTransaction,
        status: TransactionStatus.PendingPayment,
      };
      transactionsService.findById.mockResolvedValue(pendingTransaction);

      await expect(
        service.createReview(mockCtx, 'buyer_123', {
          transactionId: 'txn_123',
          rating: 'positive',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not a transaction participant', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);

      await expect(
        service.createReview(mockCtx, 'random_user', {
          transactionId: 'txn_123',
          rating: 'positive',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when user has already reviewed the transaction', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      reviewsRepository.findByTransactionAndReviewer.mockResolvedValue(
        mockReview,
      );

      await expect(
        service.createReview(mockCtx, 'buyer_123', {
          transactionId: 'txn_123',
          rating: 'positive',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getTransactionReviews', () => {
    it('should return transaction reviews for buyer', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      reviewsRepository.getByTransactionId.mockResolvedValue([mockReview]);

      const result = await service.getTransactionReviews(
        mockCtx,
        'txn_123',
        'buyer_123',
      );

      expect(result.buyerReview).toEqual(mockReview);
      expect(result.sellerReview).toBeNull();
      expect(result.canReview).toBe(false);
    });

    it('should return canReview true when user has not reviewed yet', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);
      reviewsRepository.getByTransactionId.mockResolvedValue([]);

      const result = await service.getTransactionReviews(
        mockCtx,
        'txn_123',
        'buyer_123',
      );

      expect(result.canReview).toBe(true);
      expect(result.buyerReview).toBeNull();
      expect(result.sellerReview).toBeNull();
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      transactionsService.findById.mockResolvedValue(undefined);

      await expect(
        service.getTransactionReviews(mockCtx, 'nonexistent', 'buyer_123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not a transaction participant', async () => {
      transactionsService.findById.mockResolvedValue(mockTransaction);

      await expect(
        service.getTransactionReviews(mockCtx, 'txn_123', 'random_user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSellerMetrics', () => {
    it('should return correct metrics with no reviews', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 0,
        avgRating: null,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
      });
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(5);
      usersService.findById.mockResolvedValue({
        acceptedSellerTermsAt: new Date(),
      } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result).toEqual({
        userId: 'seller_123',
        role: 'seller',
        totalTransactions: 5,
        totalReviews: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        neutralReviews: 0,
        positivePercent: null,
        badges: [],
      });
      expect(reviewsRepository.getMetricsByRevieweeIdAndRole).toHaveBeenCalledWith(
        mockCtx,
        'seller_123',
        'seller',
      );
    });

    it('should calculate positive percentage excluding neutral reviews', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 5,
        avgRating: 0.2,
        positiveCount: 2,
        negativeCount: 1,
        neutralCount: 2,
      });
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(10);
      usersService.findById.mockResolvedValue({
        acceptedSellerTermsAt: new Date(),
      } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.totalReviews).toBe(5);
      expect(result.positiveReviews).toBe(2);
      expect(result.negativeReviews).toBe(1);
      expect(result.neutralReviews).toBe(2);
      // positivePercent = 2 / (5 - 2) * 100 = 2 / 3 * 100 = 67
      expect(result.positivePercent).toBe(67);
    });

    it('should return null positivePercent when all reviews are neutral', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 2,
        avgRating: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 2,
      });
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(10);
      usersService.findById.mockResolvedValue({
        acceptedSellerTermsAt: new Date(),
      } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.positivePercent).toBeNull();
      expect(result.neutralReviews).toBe(2);
    });

    it('should include verified badge when user is VerifiedSeller', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 0,
        avgRating: null,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
      });
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(0);
      usersService.findById.mockResolvedValue({
        acceptedSellerTermsAt: new Date(),
        identityVerification: {
          status: 'approved',
          legalFirstName: 'A',
          legalLastName: 'B',
          dateOfBirth: '1990-01-01',
          governmentIdNumber: '1',
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.badges).toContain('verified');
    });

    it('should include trusted badge when threshold is met', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 12,
        avgRating: 1,
        positiveCount: 12,
        negativeCount: 0,
        neutralCount: 0,
      });
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(15);
      usersService.findById.mockResolvedValue({
        acceptedSellerTermsAt: new Date(),
      } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.badges).toContain('trusted');
    });

    it('should include best_seller badge when threshold is met for seller role', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 50,
        avgRating: 1,
        positiveCount: 50,
        negativeCount: 0,
        neutralCount: 0,
      });
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(55);
      usersService.findById.mockResolvedValue({
        acceptedSellerTermsAt: new Date(),
        identityVerification: {
          status: 'approved',
          legalFirstName: 'A',
          legalLastName: 'B',
          dateOfBirth: '1990-01-01',
          governmentIdNumber: '1',
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.badges).toContain('best_seller');
      expect(result.badges).toContain('verified');
      expect(result.badges).toContain('trusted');
    });
  });

  describe('getBuyerMetrics', () => {
    it('should return correct metrics for buyer with completed purchases', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 2,
        avgRating: 0,
        positiveCount: 1,
        negativeCount: 1,
        neutralCount: 0,
      });
      transactionsService.getBuyerCompletedPurchasesTotal.mockResolvedValue(3);
      usersService.findById.mockResolvedValue({
        acceptedSellerTermsAt: new Date(),
        identityVerification: {
          status: 'approved',
          legalFirstName: 'A',
          legalLastName: 'B',
          dateOfBirth: '1990-01-01',
          governmentIdNumber: '1',
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      } as any);

      const result = await service.getBuyerMetrics(mockCtx, 'buyer_123');

      expect(result).toEqual({
        userId: 'buyer_123',
        role: 'buyer',
        totalTransactions: 3,
        totalReviews: 2,
        positiveReviews: 1,
        negativeReviews: 1,
        neutralReviews: 0,
        positivePercent: 50,
        badges: ['verified'],
      });
      expect(
        transactionsService.getBuyerCompletedPurchasesTotal,
      ).toHaveBeenCalledWith(mockCtx, 'buyer_123');
      expect(reviewsRepository.getMetricsByRevieweeIdAndRole).toHaveBeenCalledWith(
        mockCtx,
        'buyer_123',
        'buyer',
      );
    });

    it('should return totalTransactions: 0 when buyer has no completed purchases', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 0,
        avgRating: null,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
      });
      transactionsService.getBuyerCompletedPurchasesTotal.mockResolvedValue(0);
      usersService.findById.mockResolvedValue(null);

      const result = await service.getBuyerMetrics(mockCtx, 'buyer_123');

      expect(result.totalTransactions).toBe(0);
      expect(result.badges).toContain('new_seller');
    });

    it('should not include best_seller badge for buyer role even with high metrics', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 50,
        avgRating: 1,
        positiveCount: 50,
        negativeCount: 0,
        neutralCount: 0,
      });
      transactionsService.getBuyerCompletedPurchasesTotal.mockResolvedValue(100);
      usersService.findById.mockResolvedValue({
        acceptedSellerTermsAt: new Date(),
        identityVerification: {
          status: 'approved',
          legalFirstName: 'A',
          legalLastName: 'B',
          dateOfBirth: '1990-01-01',
          governmentIdNumber: '1',
          submittedAt: new Date(),
          reviewedAt: new Date(),
        },
      } as any);

      const result = await service.getBuyerMetrics(mockCtx, 'buyer_123');

      expect(result.badges).not.toContain('best_seller');
      expect(result.badges).toContain('trusted');
      expect(result.badges).toContain('verified');
      expect(result.totalTransactions).toBe(100);
    });
  });

  describe('getSellerMetricsBatch', () => {
    const makeReview = (
      revieweeId: string,
      rating: 'positive' | 'neutral' | 'negative',
    ): Review =>
      ({
        id: `rev_${Math.random().toString(36).slice(2)}`,
        transactionId: 'txn_123',
        buyerId: 'buyer_123',
        sellerId: revieweeId,
        reviewerId: 'buyer_123',
        reviewerRole: 'buyer',
        revieweeId,
        revieweeRole: 'seller',
        rating,
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as Review;

    it('should return empty map for empty sellerIds', async () => {
      const result = await service.getSellerMetricsBatch(mockCtx, []);
      expect(result.size).toBe(0);
    });

    it('should return correct metrics for single seller with reviews', async () => {
      const sellerId = 'seller_1';
      const reviews: Review[] = [
        makeReview(sellerId, 'positive'),
        makeReview(sellerId, 'positive'),
        makeReview(sellerId, 'negative'),
        makeReview(sellerId, 'neutral'),
      ];

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue(reviews);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([[sellerId, 10]]),
      );
      usersService.findByIds.mockResolvedValue([
        { id: sellerId, acceptedSellerTermsAt: new Date() },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [sellerId]);

      expect(result.size).toBe(1);
      const metrics = result.get(sellerId)!;
      expect(metrics.userId).toBe(sellerId);
      expect(metrics.role).toBe('seller');
      expect(metrics.totalTransactions).toBe(10);
      expect(metrics.totalReviews).toBe(4);
      expect(metrics.positiveReviews).toBe(2);
      expect(metrics.negativeReviews).toBe(1);
      expect(metrics.neutralReviews).toBe(1);
      // positivePercent = 2 / (4 - 1) * 100 = 67
      expect(metrics.positivePercent).toBe(67);
      expect(metrics.badges).toEqual([]);
    });

    it('should return correct metrics for multiple sellers', async () => {
      const seller1 = 'seller_1';
      const seller2 = 'seller_2';
      const reviews: Review[] = [
        makeReview(seller1, 'positive'),
        makeReview(seller1, 'positive'),
        makeReview(seller2, 'positive'),
        makeReview(seller2, 'negative'),
        makeReview(seller2, 'neutral'),
      ];

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue(reviews);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([
          [seller1, 5],
          [seller2, 15],
        ]),
      );
      usersService.findByIds.mockResolvedValue([
        { id: seller1, acceptedSellerTermsAt: new Date() },
        { id: seller2, acceptedSellerTermsAt: new Date() },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [
        seller1,
        seller2,
      ]);

      expect(result.size).toBe(2);

      const m1 = result.get(seller1)!;
      expect(m1.totalReviews).toBe(2);
      expect(m1.positiveReviews).toBe(2);
      expect(m1.negativeReviews).toBe(0);
      expect(m1.neutralReviews).toBe(0);
      expect(m1.positivePercent).toBe(100);
      expect(m1.totalTransactions).toBe(5);

      const m2 = result.get(seller2)!;
      expect(m2.totalReviews).toBe(3);
      expect(m2.positiveReviews).toBe(1);
      expect(m2.negativeReviews).toBe(1);
      expect(m2.neutralReviews).toBe(1);
      // positivePercent = 1 / (3 - 1) * 100 = 50
      expect(m2.positivePercent).toBe(50);
      expect(m2.totalTransactions).toBe(15);
    });

    it('should include seller with no reviews with zero metrics', async () => {
      const sellerId = 'seller_no_reviews';

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue([]);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([[sellerId, 3]]),
      );
      usersService.findByIds.mockResolvedValue([
        { id: sellerId, acceptedSellerTermsAt: new Date() },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [sellerId]);

      expect(result.size).toBe(1);
      const metrics = result.get(sellerId)!;
      expect(metrics.totalReviews).toBe(0);
      expect(metrics.positiveReviews).toBe(0);
      expect(metrics.negativeReviews).toBe(0);
      expect(metrics.neutralReviews).toBe(0);
      expect(metrics.positivePercent).toBeNull();
      expect(metrics.totalTransactions).toBe(3);
      // Seller has 3 sales but 0 reviews: gets new_seller badge (no other badges apply)
      expect(metrics.badges).toEqual(['new_seller']);
    });

    it('should include verified badge when user is VerifiedSeller', async () => {
      const sellerId = 'seller_verified';

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue([]);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([[sellerId, 0]]),
      );
      usersService.findByIds.mockResolvedValue([
        {
          id: sellerId,
          acceptedSellerTermsAt: new Date(),
          identityVerification: {
            status: 'approved',
            legalFirstName: 'A',
            legalLastName: 'B',
            dateOfBirth: '1990-01-01',
            governmentIdNumber: '1',
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
        },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [sellerId]);

      expect(result.get(sellerId)!.badges).toContain('verified');
    });

    it('should include trusted badge when threshold is met', async () => {
      const sellerId = 'seller_trusted';
      const reviews: Review[] = Array(12)
        .fill(null)
        .map(() => makeReview(sellerId, 'positive'));

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue(reviews);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([[sellerId, 15]]),
      );
      usersService.findByIds.mockResolvedValue([
        { id: sellerId, acceptedSellerTermsAt: new Date() },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [sellerId]);

      expect(result.get(sellerId)!.badges).toContain('trusted');
    });

    it('should include best_seller badge when threshold is met', async () => {
      const sellerId = 'seller_best';
      const reviews: Review[] = Array(50)
        .fill(null)
        .map(() => makeReview(sellerId, 'positive'));

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue(reviews);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([[sellerId, 55]]),
      );
      usersService.findByIds.mockResolvedValue([
        { id: sellerId, acceptedSellerTermsAt: new Date() },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [sellerId]);

      expect(result.get(sellerId)!.badges).toContain('best_seller');
    });

    it('should include new_seller badge when no sales, no reviews, and no other badges', async () => {
      const sellerId = 'seller_brand_new';

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue([]);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([[sellerId, 0]]),
      );
      usersService.findByIds.mockResolvedValue([
        { id: sellerId, acceptedSellerTermsAt: new Date() },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [sellerId]);

      expect(result.get(sellerId)!.badges).toEqual(['new_seller']);
    });

    it('should not include new_seller badge when seller has sales but no reviews', async () => {
      const sellerId = 'seller_with_sales';

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue([]);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([[sellerId, 4]]),
      );
      usersService.findByIds.mockResolvedValue([
        { id: sellerId, acceptedSellerTermsAt: new Date() },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [sellerId]);

      // totalTransactions > 3: new_seller not applied (only when <= 3 and 0 reviews)
      expect(result.get(sellerId)!.badges).not.toContain('new_seller');
    });

    it('should not include new_seller badge when seller is VerifiedSeller with no activity', async () => {
      const sellerId = 'seller_verified_no_activity';

      reviewsRepository.getByRevieweeIdsAndRole.mockResolvedValue([]);
      transactionsService.getCompletedSalesTotalBatch.mockResolvedValue(
        new Map([[sellerId, 0]]),
      );
      usersService.findByIds.mockResolvedValue([
        {
          id: sellerId,
          acceptedSellerTermsAt: new Date(),
          identityVerification: {
            status: 'approved',
            legalFirstName: 'A',
            legalLastName: 'B',
            dateOfBirth: '1990-01-01',
            governmentIdNumber: '1',
            submittedAt: new Date(),
            reviewedAt: new Date(),
          },
        },
      ] as any);

      const result = await service.getSellerMetricsBatch(mockCtx, [sellerId]);

      expect(result.get(sellerId)!.badges).toContain('verified');
      expect(result.get(sellerId)!.badges).not.toContain('new_seller');
    });
  });

  describe('getSellerProfileReviews', () => {
    const mockSellerReview: Review = {
      id: 'rev_profile_1',
      transactionId: 'txn_profile_1',
      buyerId: 'buyer_profile_1',
      sellerId: 'seller_profile',
      reviewerId: 'buyer_profile_1',
      reviewerRole: 'buyer',
      revieweeId: 'seller_profile',
      revieweeRole: 'seller',
      rating: 'positive',
      comment: 'Very smooth transaction',
      createdAt: new Date('2025-01-15T10:00:00Z'),
      updatedAt: new Date('2025-01-15T10:00:00Z'),
    };

    it('should return combined stats and enriched review list (happy path)', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 3,
        avgRating: 0.67,
        positiveCount: 2,
        negativeCount: 0,
        neutralCount: 1,
      });
      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue([mockSellerReview]);
      usersService.getPublicUserInfoByIds.mockResolvedValue([
        { id: 'buyer_profile_1', publicName: 'Alice' } as any,
      ]);
      transactionsService.findByIds.mockResolvedValue([
        {
          ...mockTransaction,
          id: 'txn_profile_1',
          listingId: 'listing_profile_1',
          buyerId: 'buyer_profile_1',
          sellerId: 'seller_profile',
        } as any,
      ]);
      ticketsService.getListingsByIds.mockResolvedValue([
        {
          id: 'listing_profile_1',
          eventName: 'Rock Festival',
          type: 'General',
          eventDate: new Date('2025-03-01T21:00:00Z'),
        } as any,
      ]);

      const result = await service.getSellerProfileReviews(mockCtx, 'seller_profile', 20, 0);

      expect(result.stats).toEqual({ positive: 2, negative: 0, neutral: 1 });
      expect(result.reviews).toHaveLength(1);
      const enriched = result.reviews[0];
      expect(enriched.id).toBe('rev_profile_1');
      expect(enriched.buyerName).toBe('Alice');
      expect(enriched.type).toBe('positive');
      expect(enriched.comment).toBe('Very smooth transaction');
      expect(enriched.eventName).toBe('Rock Festival');
      expect(enriched.ticketType).toBe('General');
      expect(enriched.eventDate).toBe(new Date('2025-03-01T21:00:00Z').toISOString());
      expect(enriched.reviewDate).toBe(new Date('2025-01-15T10:00:00Z').toISOString());
      expect(reviewsRepository.getMetricsByRevieweeIdAndRole).toHaveBeenCalledWith(mockCtx, 'seller_profile', 'seller');
      expect(reviewsRepository.getByRevieweeIdAndRole).toHaveBeenCalledWith(mockCtx, 'seller_profile', 'seller', 20, 0);
    });

    it('should return empty reviews list and zero stats when seller has no reviews', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 0,
        avgRating: null,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
      });
      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue([]);

      const result = await service.getSellerProfileReviews(mockCtx, 'seller_profile', 20, 0);

      expect(result.stats).toEqual({ positive: 0, negative: 0, neutral: 0 });
      expect(result.reviews).toHaveLength(0);
      expect(usersService.getPublicUserInfoByIds).not.toHaveBeenCalled();
      expect(transactionsService.findByIds).not.toHaveBeenCalled();
      expect(ticketsService.getListingsByIds).not.toHaveBeenCalled();
    });

    it('should fall back to "Anonymous" when buyer info is missing', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 1,
        avgRating: 1,
        positiveCount: 1,
        negativeCount: 0,
        neutralCount: 0,
      });
      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue([mockSellerReview]);
      usersService.getPublicUserInfoByIds.mockResolvedValue([]);
      transactionsService.findByIds.mockResolvedValue([
        {
          ...mockTransaction,
          id: 'txn_profile_1',
          listingId: 'listing_profile_1',
          buyerId: 'buyer_profile_1',
          sellerId: 'seller_profile',
        } as any,
      ]);
      ticketsService.getListingsByIds.mockResolvedValue([
        {
          id: 'listing_profile_1',
          eventName: 'Jazz Night',
          type: 'VIP',
          eventDate: new Date('2025-06-10T20:00:00Z'),
        } as any,
      ]);

      const result = await service.getSellerProfileReviews(mockCtx, 'seller_profile', 20, 0);

      expect(result.reviews[0].buyerName).toBe('Anonymous');
    });

    it('should fall back to "Unknown Event" and null eventDate when listing is not found', async () => {
      reviewsRepository.getMetricsByRevieweeIdAndRole.mockResolvedValue({
        count: 1,
        avgRating: 1,
        positiveCount: 1,
        negativeCount: 0,
        neutralCount: 0,
      });
      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue([mockSellerReview]);
      usersService.getPublicUserInfoByIds.mockResolvedValue([
        { id: 'buyer_profile_1', publicName: 'Bob' } as any,
      ]);
      transactionsService.findByIds.mockResolvedValue([
        {
          ...mockTransaction,
          id: 'txn_profile_1',
          listingId: 'listing_missing',
          buyerId: 'buyer_profile_1',
          sellerId: 'seller_profile',
        } as any,
      ]);
      ticketsService.getListingsByIds.mockResolvedValue([]);

      const result = await service.getSellerProfileReviews(mockCtx, 'seller_profile', 20, 0);

      expect(result.reviews[0].eventName).toBe('Unknown Event');
      expect(result.reviews[0].eventDate).toBeNull();
    });
  });
});
