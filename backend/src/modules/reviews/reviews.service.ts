import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ReviewsRepository } from './reviews.repository';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { TicketsService } from '../tickets/tickets.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  Review,
  ReviewRating,
  ReviewPartyRole,
  UserReviewMetrics,
  UserBadge,
} from './reviews.domain';
import { BADGE_THRESHOLDS } from './reviews.domain';
import { TransactionStatus } from '../transactions/transactions.domain';
import type {
  CreateReviewRequest,
  GetTransactionReviewsResponse,
  SellerProfileReview,
} from './reviews.api';

@Injectable()
export class ReviewsService {
  private readonly logger = new ContextLogger(ReviewsService.name);

  constructor(
    @Inject(ReviewsRepository)
    private readonly reviewsRepository: ReviewsRepository,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
  ) {}

  /**
   * Generate a unique review ID
   */
  private generateId(): string {
    return `rev_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Create a review for a transaction
   */
  async createReview(
    ctx: Ctx,
    userId: string,
    request: CreateReviewRequest,
  ): Promise<Review> {
    this.logger.log(
      ctx,
      `User ${userId} creating review for transaction ${request.transactionId}`,
    );

    const transaction = await this.transactionsService.findById(
      ctx,
      request.transactionId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.Completed) {
      throw new BadRequestException('Can only review completed transactions');
    }

    const isBuyer = transaction.buyerId === userId;
    const isSeller = transaction.sellerId === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException(
        'Only transaction participants can leave reviews',
      );
    }

    const existingReview =
      await this.reviewsRepository.findByTransactionAndReviewer(
        ctx,
        request.transactionId,
        userId,
      );

    if (existingReview) {
      throw new ConflictException('You have already reviewed this transaction');
    }

    const reviewerRole: ReviewPartyRole = isBuyer ? 'buyer' : 'seller';
    const revieweeRole: ReviewPartyRole = isBuyer ? 'seller' : 'buyer';
    const revieweeId = isBuyer ? transaction.sellerId : transaction.buyerId;

    const now = new Date();
    const review: Review = {
      id: this.generateId(),
      transactionId: request.transactionId,
      buyerId: transaction.buyerId,
      sellerId: transaction.sellerId,
      reviewerId: userId,
      reviewerRole,
      revieweeId,
      revieweeRole,
      rating: request.rating,
      comment: request.comment,
      createdAt: now,
      updatedAt: now,
    };

    await this.reviewsRepository.create(ctx, review);

    this.logger.log(
      ctx,
      `Review ${review.id} created for transaction ${request.transactionId}`,
    );

    return review;
  }

  /**
   * Get reviews for a transaction
   */
  async getTransactionReviews(
    ctx: Ctx,
    transactionId: string,
    userId: string,
  ): Promise<GetTransactionReviewsResponse> {
    const transaction = await this.transactionsService.findById(
      ctx,
      transactionId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const isBuyer = transaction.buyerId === userId;
    const isSeller = transaction.sellerId === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('Access denied');
    }

    const reviews = await this.reviewsRepository.getByTransactionId(
      ctx,
      transactionId,
    );

    const buyerReview = reviews.find((r) => r.reviewerRole === 'buyer') || null;
    const sellerReview =
      reviews.find((r) => r.reviewerRole === 'seller') || null;

    const userReview = reviews.find((r) => r.reviewerId === userId);
    const canReview =
      transaction.status === TransactionStatus.Completed && !userReview;

    return {
      buyerReview,
      sellerReview,
      canReview,
    };
  }

  /**
   * Calculate badges for a user
   */
  private async calculateBadges(
    ctx: Ctx,
    userId: string,
    role: ReviewPartyRole,
    positiveReviews: number,
    totalReviews: number,
    totalTransactions: number,
  ): Promise<UserBadge[]> {
    const badges: UserBadge[] = [];

    const user = await this.usersService.findById(ctx, userId);
    if (user?.phoneVerified) {
      badges.push('verified');
    }

    const positivePercent =
      totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0;

    if (
      positiveReviews >= BADGE_THRESHOLDS.trusted.minPositiveReviews &&
      positivePercent >= BADGE_THRESHOLDS.trusted.minPositivePercent
    ) {
      badges.push('trusted');
    }

    if (
      role === 'seller' &&
      totalTransactions >= BADGE_THRESHOLDS.bestSeller.minSales &&
      positivePercent >= BADGE_THRESHOLDS.bestSeller.minPositivePercent
    ) {
      badges.push('best_seller');
    }

    return badges;
  }

  /**
   * Get seller review metrics
   */
  async getSellerMetrics(ctx: Ctx, userId: string): Promise<UserReviewMetrics> {
    this.logger.log(ctx, `Getting seller metrics for user ${userId}`);

    const reviews = await this.reviewsRepository.getByRevieweeIdAndRole(
      ctx,
      userId,
      'seller',
    );

    const totalReviews = reviews.length;
    const positiveReviews = reviews.filter(
      (r) => r.rating === 'positive',
    ).length;
    const negativeReviews = reviews.filter(
      (r) => r.rating === 'negative',
    ).length;
    const neutralReviews = reviews.filter((r) => r.rating === 'neutral').length;

    const nonNeutralReviews = totalReviews - neutralReviews;
    const positivePercent =
      nonNeutralReviews > 0
        ? Math.round((positiveReviews / nonNeutralReviews) * 100)
        : null;

    const totalTransactions =
      await this.transactionsService.getSellerCompletedSalesTotal(ctx, userId);

    const badges = await this.calculateBadges(
      ctx,
      userId,
      'seller',
      positiveReviews,
      totalReviews,
      totalTransactions,
    );

    return {
      userId,
      role: 'seller',
      totalTransactions,
      totalReviews,
      positiveReviews,
      negativeReviews,
      neutralReviews,
      positivePercent,
      badges,
    };
  }

  /**
   * Get buyer review metrics
   */
  async getBuyerMetrics(ctx: Ctx, userId: string): Promise<UserReviewMetrics> {
    this.logger.log(ctx, `Getting buyer metrics for user ${userId}`);

    const reviews = await this.reviewsRepository.getByRevieweeIdAndRole(
      ctx,
      userId,
      'buyer',
    );

    const totalReviews = reviews.length;
    const positiveReviews = reviews.filter(
      (r) => r.rating === 'positive',
    ).length;
    const negativeReviews = reviews.filter(
      (r) => r.rating === 'negative',
    ).length;
    const neutralReviews = reviews.filter((r) => r.rating === 'neutral').length;

    const nonNeutralReviews = totalReviews - neutralReviews;
    const positivePercent =
      nonNeutralReviews > 0
        ? Math.round((positiveReviews / nonNeutralReviews) * 100)
        : null;

    const badges = await this.calculateBadges(
      ctx,
      userId,
      'buyer',
      positiveReviews,
      totalReviews,
      0,
    );

    return {
      userId,
      role: 'buyer',
      totalTransactions: 0,
      totalReviews,
      positiveReviews,
      negativeReviews,
      neutralReviews,
      positivePercent,
      badges,
    };
  }

  /**
   * Get enriched reviews for seller profile display
   */
  async getSellerProfileReviews(
    ctx: Ctx,
    sellerId: string,
  ): Promise<{
    stats: { positive: number; neutral: number; negative: number };
    reviews: SellerProfileReview[];
  }> {
    this.logger.log(ctx, `Getting seller profile reviews for user ${sellerId}`);

    const reviews = await this.reviewsRepository.getByRevieweeIdAndRole(
      ctx,
      sellerId,
      'seller',
    );

    const stats = {
      positive: reviews.filter((r) => r.rating === 'positive').length,
      neutral: reviews.filter((r) => r.rating === 'neutral').length,
      negative: reviews.filter((r) => r.rating === 'negative').length,
    };

    if (reviews.length === 0) {
      return { stats, reviews: [] };
    }

    const buyerIds = [...new Set(reviews.map((r) => r.buyerId))];
    const buyerInfos = await this.usersService.getPublicUserInfoByIds(
      ctx,
      buyerIds,
    );
    const buyerMap = new Map(buyerInfos.map((b) => [b.id, b]));

    const transactionIds = [...new Set(reviews.map((r) => r.transactionId))];
    const transactionsWithListings = await Promise.all(
      transactionIds.map(async (txnId) => {
        const txn = await this.transactionsService.findById(ctx, txnId);
        if (!txn) return null;
        const listing = await this.ticketsService.getListingById(
          ctx,
          txn.listingId,
        );
        return { txnId, listing };
      }),
    );
    const listingMap = new Map(
      transactionsWithListings
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((t) => [t.txnId, t.listing]),
    );

    const enrichedReviews: SellerProfileReview[] = reviews.map((review) => {
      const buyer = buyerMap.get(review.buyerId);
      const listing = listingMap.get(review.transactionId);

      return {
        id: review.id,
        buyerName: buyer?.publicName ?? 'Anonymous',
        type: review.rating,
        comment: review.comment ?? '',
        eventName: listing?.eventName ?? 'Unknown Event',
        ticketType: listing?.type ?? 'Unknown',
        eventDate: listing?.eventDate
          ? new Date(listing.eventDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Unknown',
        reviewDate: new Date(review.createdAt).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    });

    return { stats, reviews: enrichedReviews };
  }
}
