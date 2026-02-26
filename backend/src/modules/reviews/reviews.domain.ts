/**
 * Review rating type - ternary rating system
 */
export type ReviewRating = 'positive' | 'negative' | 'neutral';

/**
 * Role of the person giving/receiving the review
 */
export type ReviewPartyRole = 'buyer' | 'seller';

/**
 * Review entity
 */
export interface Review {
  id: string;
  transactionId: string;
  buyerId: string;
  sellerId: string;
  reviewerId: string;
  reviewerRole: ReviewPartyRole;
  revieweeId: string;
  revieweeRole: ReviewPartyRole;
  rating: ReviewRating;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User badge types
 */
export type UserBadge = 'verified' | 'trusted' | 'best_seller';

/**
 * Aggregated review metrics for a user in a specific role
 */
export interface UserReviewMetrics {
  userId: string;
  role: ReviewPartyRole;
  totalTransactions: number;
  totalReviews: number;
  positiveReviews: number;
  negativeReviews: number;
  neutralReviews: number;
  positivePercent: number | null;
  badges: UserBadge[];
}

/**
 * Badge thresholds for awarding badges
 */
export const BADGE_THRESHOLDS = {
  trusted: {
    minPositiveReviews: 10,
    minPositivePercent: 90,
  },
  bestSeller: {
    minSales: 50,
    minPositivePercent: 95,
  },
} as const;
