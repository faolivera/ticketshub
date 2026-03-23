import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import type {
  Review as PrismaReview,
  Transaction as PrismaTransaction,
  ReviewRole as PrismaReviewRole,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Review, ReviewRating, ReviewPartyRole } from './reviews.domain';
import type { IReviewsRepository, ReviewMetrics } from './reviews.repository.interface';

type PrismaReviewWithTransaction = PrismaReview & {
  transaction: Pick<PrismaTransaction, 'buyerId' | 'sellerId'>;
};

@Injectable()
export class ReviewsRepository extends BaseRepository implements IReviewsRepository {
  private readonly logger = new ContextLogger(ReviewsRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(_ctx: Ctx, review: Review): Promise<Review> {
    this.logger.debug(_ctx, 'create', { reviewId: review.id, transactionId: review.transactionId });
    const prismaReview = await this.getClient(_ctx).review.create({
      data: {
        id: review.id,
        transactionId: review.transactionId,
        reviewerId: review.reviewerId,
        revieweeId: review.revieweeId,
        reviewerRole: this.mapRoleToDb(review.reviewerRole),
        revieweeRole: this.mapRoleToDb(review.revieweeRole),
        rating: this.mapRatingToDb(review.rating),
        comment: review.comment,
      },
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return this.mapToReview(prismaReview);
  }

  async findById(_ctx: Ctx, id: string): Promise<Review | undefined> {
    this.logger.debug(_ctx, 'findById', { id });
    const review = await this.getClient(_ctx).review.findUnique({
      where: { id },
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return review ? this.mapToReview(review) : undefined;
  }

  async findByTransactionAndReviewer(
    _ctx: Ctx,
    transactionId: string,
    reviewerId: string,
  ): Promise<Review | undefined> {
    this.logger.debug(_ctx, 'findByTransactionAndReviewer', { transactionId, reviewerId });
    const review = await this.getClient(_ctx).review.findUnique({
      where: {
        transactionId_reviewerId: {
          transactionId,
          reviewerId,
        },
      },
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return review ? this.mapToReview(review) : undefined;
  }

  async getByTransactionId(
    _ctx: Ctx,
    transactionId: string,
  ): Promise<Review[]> {
    this.logger.debug(_ctx, 'getByTransactionId', { transactionId });
    const reviews = await this.getClient(_ctx).review.findMany({
      where: { transactionId },
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return reviews.map((r) => this.mapToReview(r));
  }

  async getByRevieweeIdAndRole(
    _ctx: Ctx,
    revieweeId: string,
    revieweeRole: ReviewPartyRole,
    take: number = 20,
    skip: number = 0,
  ): Promise<Review[]> {
    this.logger.debug(_ctx, 'getByRevieweeIdAndRole', { revieweeId, revieweeRole, take, skip });
    const reviews = await this.getClient(_ctx).review.findMany({
      where: {
        revieweeId,
        revieweeRole: this.mapRoleToDb(revieweeRole),
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return reviews.map((r) => this.mapToReview(r));
  }

  async getMetricsByRevieweeIdAndRole(
    _ctx: Ctx,
    revieweeId: string,
    revieweeRole: ReviewPartyRole,
  ): Promise<ReviewMetrics> {
    this.logger.debug(_ctx, 'getMetricsByRevieweeIdAndRole', { revieweeId, revieweeRole });
    const client = this.getClient(_ctx);
    const where = { revieweeId, revieweeRole: this.mapRoleToDb(revieweeRole) };
    const [result, positiveCount, negativeCount, neutralCount] = await Promise.all([
      client.review.aggregate({
        where,
        _count: true,
        _avg: { rating: true },
      }),
      client.review.count({ where: { ...where, rating: 1 } }),
      client.review.count({ where: { ...where, rating: -1 } }),
      client.review.count({ where: { ...where, rating: 0 } }),
    ]);
    return {
      count: result._count,
      avgRating: result._avg.rating,
      positiveCount,
      negativeCount,
      neutralCount,
    };
  }

  async getByRevieweeIdsAndRole(
    _ctx: Ctx,
    revieweeIds: string[],
    revieweeRole: ReviewPartyRole,
  ): Promise<Review[]> {
    this.logger.debug(_ctx, 'getByRevieweeIdsAndRole', { count: revieweeIds.length, revieweeRole });
    if (revieweeIds.length === 0) return [];
    const reviews = await this.getClient(_ctx).review.findMany({
      where: {
        revieweeId: { in: revieweeIds },
        revieweeRole: this.mapRoleToDb(revieweeRole),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return reviews.map((r) => this.mapToReview(r));
  }

  async getByReviewerId(_ctx: Ctx, reviewerId: string): Promise<Review[]> {
    this.logger.debug(_ctx, 'getByReviewerId', { reviewerId });
    const reviews = await this.getClient(_ctx).review.findMany({
      where: { reviewerId },
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return reviews.map((r) => this.mapToReview(r));
  }

  private mapToReview(prismaReview: PrismaReviewWithTransaction): Review {
    return {
      id: prismaReview.id,
      transactionId: prismaReview.transactionId,
      buyerId: prismaReview.transaction.buyerId,
      sellerId: prismaReview.transaction.sellerId,
      reviewerId: prismaReview.reviewerId,
      reviewerRole: this.mapRoleFromDb(prismaReview.reviewerRole),
      revieweeId: prismaReview.revieweeId,
      revieweeRole: this.mapRoleFromDb(prismaReview.revieweeRole),
      rating: this.mapRatingFromDb(prismaReview.rating),
      comment: prismaReview.comment ?? undefined,
      createdAt: prismaReview.createdAt,
      updatedAt: prismaReview.createdAt,
    };
  }

  private mapRoleToDb(role: ReviewPartyRole): PrismaReviewRole {
    return role as PrismaReviewRole;
  }

  private mapRoleFromDb(role: PrismaReviewRole): ReviewPartyRole {
    return role as ReviewPartyRole;
  }

  private mapRatingToDb(rating: ReviewRating): number {
    switch (rating) {
      case 'positive':
        return 1;
      case 'neutral':
        return 0;
      case 'negative':
        return -1;
    }
  }

  private mapRatingFromDb(rating: number): ReviewRating {
    if (rating > 0) return 'positive';
    if (rating < 0) return 'negative';
    return 'neutral';
  }
}
