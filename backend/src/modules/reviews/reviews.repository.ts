import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  Review as PrismaReview,
  Transaction as PrismaTransaction,
  ReviewRole as PrismaReviewRole,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import type { Review, ReviewRating, ReviewPartyRole } from './reviews.domain';
import type { IReviewsRepository } from './reviews.repository.interface';

type PrismaReviewWithTransaction = PrismaReview & {
  transaction: Pick<PrismaTransaction, 'buyerId' | 'sellerId'>;
};

@Injectable()
export class ReviewsRepository implements IReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(_ctx: Ctx, review: Review): Promise<Review> {
    const prismaReview = await this.prisma.review.create({
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
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return review ? this.mapToReview(review) : undefined;
  }

  async getAll(_ctx: Ctx): Promise<Review[]> {
    const reviews = await this.prisma.review.findMany({
      include: {
        transaction: {
          select: { buyerId: true, sellerId: true },
        },
      },
    });
    return reviews.map((r) => this.mapToReview(r));
  }

  async findByTransactionAndReviewer(
    _ctx: Ctx,
    transactionId: string,
    reviewerId: string,
  ): Promise<Review | undefined> {
    const review = await this.prisma.review.findUnique({
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
    const reviews = await this.prisma.review.findMany({
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
  ): Promise<Review[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        revieweeId,
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
    const reviews = await this.prisma.review.findMany({
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
