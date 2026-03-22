import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  REVIEWS_REPOSITORY,
  type IReviewsRepository,
} from './reviews.repository.interface';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { TicketsService } from '../tickets/tickets.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  Review,
  ReviewPartyRole,
  UserReviewMetrics,
  UserBadge,
} from './reviews.domain';
import { BADGE_THRESHOLDS } from './reviews.domain';
import { VerificationHelper } from '../../common/utils/verification-helper';
import { FireAndForget } from '../../common/utils/fire-and-forget';
import { TransactionStatus } from '../transactions/transactions.domain';
import type {
  CreateReviewRequest,
  GetTransactionReviewsResponse,
  SellerProfileReview,
} from './reviews.api';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEventType } from '../notifications/notifications.domain';

@Injectable()
export class ReviewsService {
  private readonly logger = new ContextLogger(ReviewsService.name);

  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviewsRepository: IReviewsRepository,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
    private readonly notificationsService: NotificationsService,
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

    if (
      transaction.status !== TransactionStatus.Completed &&
      transaction.status !== TransactionStatus.TransferringFund
    ) {
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

    FireAndForget.run(
      ctx,
      async (cleanCtx) => {
        const reviewer = await this.usersService.findById(cleanCtx, userId);
        await this.notificationsService.emit(cleanCtx, NotificationEventType.REVIEW_RECEIVED, {
          transactionId: request.transactionId,
          reviewId: review.id,
          rating: review.rating,
          reviewerId: userId,
          reviewerName: reviewer?.publicName || 'User',
          revieweeId,
          comment: review.comment,
        });
      },
      this.logger,
      'Failed to emit REVIEW_RECEIVED',
    );

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
      (transaction.status === TransactionStatus.Completed ||
        transaction.status === TransactionStatus.TransferringFund) &&
      !userReview;

    return {
      buyerReview,
      sellerReview,
      canReview,
    };
  }

  /**
   * Pure badge computation — no I/O, single source of truth for badge rules.
   */
  private computeBadges(params: {
    isVerifiedSeller: boolean;
    role: ReviewPartyRole;
    positiveReviews: number;
    totalReviews: number;
    totalTransactions: number;
  }): UserBadge[] {
    const {
      isVerifiedSeller,
      role,
      positiveReviews,
      totalReviews,
      totalTransactions,
    } = params;
    const badges: UserBadge[] = [];

    if (isVerifiedSeller) {
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

    if (badges.length === 0 && totalTransactions <= 3 && totalReviews === 0) {
      badges.push('new_seller');
    }

    return badges;
  }

  /**
   * Calculate badges for a user (fetches user data unless provided, then delegates to computeBadges).
   */
  private async calculateBadges(
    ctx: Ctx,
    userId: string,
    role: ReviewPartyRole,
    positiveReviews: number,
    totalReviews: number,
    totalTransactions: number,
    user?: import('../users/users.domain').User | null,
  ): Promise<UserBadge[]> {
    const resolvedUser =
      user !== undefined ? user : await this.usersService.findById(ctx, userId);
    return this.computeBadges({
      isVerifiedSeller: resolvedUser
        ? VerificationHelper.hasV3(resolvedUser)
        : false,
      role,
      positiveReviews,
      totalReviews,
      totalTransactions,
    });
  }

  /**
   * Get seller review metrics.
   * Optional opts: pass { user, totalTransactions } to avoid duplicate fetches (e.g. from BFF).
   */
  async getSellerMetrics(
    ctx: Ctx,
    userId: string,
    opts?: {
      user?: import('../users/users.domain').User | null;
      totalTransactions?: number;
    },
  ): Promise<UserReviewMetrics> {
    this.logger.log(ctx, `Getting seller metrics for user ${userId}`);

    const reviews = await this.reviewsRepository.getByRevieweeIdAndRole(
      ctx,
      userId,
      'seller',
    );

    const totalReviews = reviews.length;
    const { positive: positiveReviews, negative: negativeReviews, neutral: neutralReviews } =
      this.countRatings(reviews);

    const nonNeutralReviews = totalReviews - neutralReviews;
    const positivePercent =
      nonNeutralReviews > 0
        ? Math.round((positiveReviews / nonNeutralReviews) * 100)
        : null;

    const totalTransactions =
      opts?.totalTransactions !== undefined
        ? opts.totalTransactions
        : await this.transactionsService.getSellerCompletedSalesTotal(
            ctx,
            userId,
          );

    const badges = await this.calculateBadges(
      ctx,
      userId,
      'seller',
      positiveReviews,
      totalReviews,
      totalTransactions,
      opts?.user,
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
   * Get seller review metrics for multiple sellers (batch).
   * Uses 3 queries total: reviews, completed sales, and users for badge computation.
   */
  async getSellerMetricsBatch(
    ctx: Ctx,
    sellerIds: string[],
  ): Promise<Map<string, UserReviewMetrics>> {
    if (sellerIds.length === 0) return new Map();

    const [allReviews, salesMap, users] = await Promise.all([
      this.reviewsRepository.getByRevieweeIdsAndRole(ctx, sellerIds, 'seller'),
      this.transactionsService.getCompletedSalesTotalBatch(ctx, sellerIds),
      this.usersService.findByIds(ctx, sellerIds),
    ]);

    const usersMap = new Map(users.map((u) => [u.id, u]));

    const reviewsBySeller = new Map<string, typeof allReviews>();
    for (const review of allReviews) {
      const list = reviewsBySeller.get(review.revieweeId) ?? [];
      list.push(review);
      reviewsBySeller.set(review.revieweeId, list);
    }

    const result = new Map<string, UserReviewMetrics>();

    for (const sellerId of sellerIds) {
      const reviews = reviewsBySeller.get(sellerId) ?? [];
      const totalReviews = reviews.length;
      const { positive: positiveReviews, negative: negativeReviews, neutral: neutralReviews } =
        this.countRatings(reviews);

      const nonNeutralReviews = totalReviews - neutralReviews;
      const positivePercent =
        nonNeutralReviews > 0
          ? Math.round((positiveReviews / nonNeutralReviews) * 100)
          : null;

      const totalTransactions = salesMap.get(sellerId) ?? 0;
      const user = usersMap.get(sellerId);

      const badges = this.computeBadges({
        isVerifiedSeller: user ? VerificationHelper.hasV3(user) : false,
        role: 'seller',
        positiveReviews,
        totalReviews,
        totalTransactions,
      });

      result.set(sellerId, {
        userId: sellerId,
        role: 'seller',
        totalTransactions,
        totalReviews,
        positiveReviews,
        negativeReviews,
        neutralReviews,
        positivePercent,
        badges,
      });
    }

    return result;
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
    const { positive: positiveReviews, negative: negativeReviews, neutral: neutralReviews } =
      this.countRatings(reviews);

    const nonNeutralReviews = totalReviews - neutralReviews;
    const positivePercent =
      nonNeutralReviews > 0
        ? Math.round((positiveReviews / nonNeutralReviews) * 100)
        : null;

    const totalTransactions =
      await this.transactionsService.getBuyerCompletedPurchasesTotal(
        ctx,
        userId,
      );

    const badges = await this.calculateBadges(
      ctx,
      userId,
      'buyer',
      positiveReviews,
      totalReviews,
      totalTransactions,
    );

    return {
      userId,
      role: 'buyer',
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

    const { positive, negative, neutral } = this.countRatings(reviews);
    const stats = { positive, negative, neutral };

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
    const transactions = await this.transactionsService.findByIds(
      ctx,
      transactionIds,
    );
    const txnMap = new Map(transactions.map((t) => [t.id, t]));
    const listingIds = [
      ...new Set(transactions.map((t) => t.listingId).filter(Boolean)),
    ];
    const listings = await this.ticketsService.getListingsByIds(
      ctx,
      listingIds,
    );
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    const enrichedReviews: SellerProfileReview[] = reviews.map((review) => {
      const buyer = buyerMap.get(review.buyerId);
      const txn = txnMap.get(review.transactionId);
      const listing = txn ? listingMap.get(txn.listingId) : undefined;

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

  private countRatings(reviews: { rating: string }[]): {
    positive: number;
    negative: number;
    neutral: number;
  } {
    return reviews.reduce(
      (acc, r) => {
        if (r.rating === 'positive') acc.positive++;
        else if (r.rating === 'negative') acc.negative++;
        else if (r.rating === 'neutral') acc.neutral++;
        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 },
    );
  }
}
