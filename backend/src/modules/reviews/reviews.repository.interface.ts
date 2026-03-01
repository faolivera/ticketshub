import type { Ctx } from '../../common/types/context';
import type { Review, ReviewPartyRole } from './reviews.domain';

/**
 * Reviews repository interface
 */
export interface IReviewsRepository {
  /**
   * Create a new review
   */
  create(ctx: Ctx, review: Review): Promise<Review>;

  /**
   * Find review by ID
   */
  findById(ctx: Ctx, id: string): Promise<Review | undefined>;

  /**
   * Get all reviews
   */
  getAll(ctx: Ctx): Promise<Review[]>;

  /**
   * Find review by transaction and reviewer
   */
  findByTransactionAndReviewer(
    ctx: Ctx,
    transactionId: string,
    reviewerId: string,
  ): Promise<Review | undefined>;

  /**
   * Get reviews by transaction ID
   */
  getByTransactionId(ctx: Ctx, transactionId: string): Promise<Review[]>;

  /**
   * Get reviews where user is the reviewee with a specific role
   */
  getByRevieweeIdAndRole(
    ctx: Ctx,
    revieweeId: string,
    revieweeRole: ReviewPartyRole,
  ): Promise<Review[]>;

  /**
   * Get reviews by reviewer ID
   */
  getByReviewerId(ctx: Ctx, reviewerId: string): Promise<Review[]>;
}

/**
 * Injection token for IReviewsRepository
 */
export const REVIEWS_REPOSITORY = Symbol('IReviewsRepository');
