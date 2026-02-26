import type { Review, UserReviewMetrics, ReviewRating } from './reviews.domain';

/**
 * Request to create a review
 */
export interface CreateReviewRequest {
  transactionId: string;
  rating: ReviewRating;
  comment?: string;
}

/**
 * Response when creating a review
 */
export type CreateReviewResponse = Review;

/**
 * Response for user review metrics
 */
export type GetUserReviewMetricsResponse = UserReviewMetrics;

/**
 * Response for transaction reviews
 */
export interface GetTransactionReviewsResponse {
  buyerReview: Review | null;
  sellerReview: Review | null;
  canReview: boolean;
}

/**
 * Enriched review for seller profile display
 */
export interface SellerProfileReview {
  id: string;
  buyerName: string;
  type: ReviewRating;
  comment: string;
  eventName: string;
  ticketType: string;
  eventDate: string;
  reviewDate: string;
}

/**
 * Response for seller profile reviews
 */
export interface GetSellerProfileReviewsResponse {
  stats: {
    positive: number;
    neutral: number;
    negative: number;
  };
  reviews: SellerProfileReview[];
}
