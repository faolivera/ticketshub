export type ReviewRating = 'positive' | 'negative' | 'neutral';
export type ReviewPartyRole = 'buyer' | 'seller';
export type UserBadge = 'verified' | 'trusted' | 'best_seller';

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
  createdAt: string;
  updatedAt: string;
}

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

export interface CreateReviewRequest {
  transactionId: string;
  rating: ReviewRating;
  comment?: string;
}

export interface TransactionReviewsResponse {
  buyerReview: Review | null;
  sellerReview: Review | null;
  canReview: boolean;
}
