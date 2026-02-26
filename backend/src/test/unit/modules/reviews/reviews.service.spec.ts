import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from '../../../../modules/reviews/reviews.service';
import { ReviewsRepository } from '../../../../modules/reviews/reviews.repository';
import { TransactionsService } from '../../../../modules/transactions/transactions.service';
import { UsersService } from '../../../../modules/users/users.service';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { TransactionStatus } from '../../../../modules/transactions/transactions.domain';
import { TicketType } from '../../../../modules/tickets/tickets.domain';
import type { Review } from '../../../../modules/reviews/reviews.domain';
import type { Transaction } from '../../../../modules/transactions/transactions.domain';
import type { Ctx } from '../../../../common/types/context';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewsRepository: jest.Mocked<ReviewsRepository>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let usersService: jest.Mocked<UsersService>;
  let ticketsService: jest.Mocked<TicketsService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockTransaction: Transaction = {
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketType: TicketType.DigitalTransferable,
    ticketUnitIds: ['unit_1'],
    quantity: 1,
    ticketPrice: { amount: 10000, currency: 'USD' },
    buyerFee: { amount: 1000, currency: 'USD' },
    sellerFee: { amount: 500, currency: 'USD' },
    totalPaid: { amount: 11000, currency: 'USD' },
    sellerReceives: { amount: 9500, currency: 'USD' },
    status: TransactionStatus.Completed,
    createdAt: new Date(),
    updatedAt: new Date(),
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
      getAll: jest.fn(),
      findByTransactionAndReviewer: jest.fn(),
      getByTransactionId: jest.fn(),
      getByRevieweeIdAndRole: jest.fn(),
      getByReviewerId: jest.fn(),
    };

    const mockTransactionsService = {
      findById: jest.fn(),
      getSellerCompletedSalesTotal: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
      getPublicUserInfoByIds: jest.fn(),
    };

    const mockTicketsService = {
      getListingById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: mockReviewsRepository },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TicketsService, useValue: mockTicketsService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    reviewsRepository = module.get(ReviewsRepository);
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
      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue([]);
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(5);
      usersService.findById.mockResolvedValue({ phoneVerified: false } as any);

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
    });

    it('should calculate positive percentage excluding neutral reviews', async () => {
      const reviews: Review[] = [
        { ...mockReview, id: 'rev_1', rating: 'positive' },
        { ...mockReview, id: 'rev_2', rating: 'positive' },
        { ...mockReview, id: 'rev_3', rating: 'negative' },
        { ...mockReview, id: 'rev_4', rating: 'neutral' },
        { ...mockReview, id: 'rev_5', rating: 'neutral' },
      ];

      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue(reviews);
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(10);
      usersService.findById.mockResolvedValue({ phoneVerified: false } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.totalReviews).toBe(5);
      expect(result.positiveReviews).toBe(2);
      expect(result.negativeReviews).toBe(1);
      expect(result.neutralReviews).toBe(2);
      // positivePercent = 2 / (5 - 2) * 100 = 2 / 3 * 100 = 67
      expect(result.positivePercent).toBe(67);
    });

    it('should return null positivePercent when all reviews are neutral', async () => {
      const reviews: Review[] = [
        { ...mockReview, id: 'rev_1', rating: 'neutral' },
        { ...mockReview, id: 'rev_2', rating: 'neutral' },
      ];

      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue(reviews);
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(10);
      usersService.findById.mockResolvedValue({ phoneVerified: false } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.positivePercent).toBeNull();
      expect(result.neutralReviews).toBe(2);
    });

    it('should include verified badge when user has phone verified', async () => {
      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue([]);
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(0);
      usersService.findById.mockResolvedValue({ phoneVerified: true } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.badges).toContain('verified');
    });

    it('should include trusted badge when threshold is met', async () => {
      const positiveReviews: Review[] = Array(12)
        .fill(null)
        .map((_, i) => ({
          ...mockReview,
          id: `rev_${i}`,
          rating: 'positive' as const,
        }));

      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue(
        positiveReviews,
      );
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(15);
      usersService.findById.mockResolvedValue({ phoneVerified: false } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.badges).toContain('trusted');
    });

    it('should include best_seller badge when threshold is met for seller role', async () => {
      const positiveReviews: Review[] = Array(50)
        .fill(null)
        .map((_, i) => ({
          ...mockReview,
          id: `rev_${i}`,
          rating: 'positive' as const,
        }));

      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue(
        positiveReviews,
      );
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(55);
      usersService.findById.mockResolvedValue({ phoneVerified: true } as any);

      const result = await service.getSellerMetrics(mockCtx, 'seller_123');

      expect(result.badges).toContain('best_seller');
      expect(result.badges).toContain('verified');
      expect(result.badges).toContain('trusted');
    });
  });

  describe('getBuyerMetrics', () => {
    it('should return correct metrics for buyer', async () => {
      const reviews: Review[] = [
        { ...mockReview, id: 'rev_1', rating: 'positive' },
        { ...mockReview, id: 'rev_2', rating: 'negative' },
      ];

      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue(reviews);
      usersService.findById.mockResolvedValue({ phoneVerified: true } as any);

      const result = await service.getBuyerMetrics(mockCtx, 'buyer_123');

      expect(result).toEqual({
        userId: 'buyer_123',
        role: 'buyer',
        totalTransactions: 0,
        totalReviews: 2,
        positiveReviews: 1,
        negativeReviews: 1,
        neutralReviews: 0,
        positivePercent: 50,
        badges: ['verified'],
      });
    });

    it('should not include best_seller badge for buyer role even with high metrics', async () => {
      const positiveReviews: Review[] = Array(50)
        .fill(null)
        .map((_, i) => ({
          ...mockReview,
          id: `rev_${i}`,
          rating: 'positive' as const,
        }));

      reviewsRepository.getByRevieweeIdAndRole.mockResolvedValue(
        positiveReviews,
      );
      usersService.findById.mockResolvedValue({ phoneVerified: true } as any);

      const result = await service.getBuyerMetrics(mockCtx, 'buyer_123');

      expect(result.badges).not.toContain('best_seller');
      expect(result.badges).toContain('trusted');
      expect(result.badges).toContain('verified');
    });
  });
});
