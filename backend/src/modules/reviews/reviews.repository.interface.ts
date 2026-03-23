import type { Ctx } from '../../common/types/context';
import type { Review, ReviewPartyRole } from './reviews.domain';

/**
 * Aggregate metrics returned by getMetricsByRevieweeIdAndRole
 */
export interface ReviewMetrics {
  count: number;
  avgRating: number | null;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

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
   * Get reviews where user is the reviewee with a specific role (paginated)
   */
  getByRevieweeIdAndRole(
    ctx: Ctx,
    revieweeId: string,
    revieweeRole: ReviewPartyRole,
    take?: number,
    skip?: number,
  ): Promise<Review[]>;

  /**
   * Get aggregate metrics (count per rating bucket) for a reviewee in a specific role
   */
  getMetricsByRevieweeIdAndRole(
    ctx: Ctx,
    revieweeId: string,
    revieweeRole: ReviewPartyRole,
  ): Promise<ReviewMetrics>;

  /**
   * Get reviews where any of the given users is the reviewee with a specific role (batch)
   */
  getByRevieweeIdsAndRole(
    ctx: Ctx,
    revieweeIds: string[],
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
