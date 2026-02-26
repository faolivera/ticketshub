import apiClient from '../client';
import type {
  UserReviewMetrics,
  Review,
  CreateReviewRequest,
  TransactionReviewsResponse,
} from '../types';

/**
 * Reviews service
 */
export const reviewsService = {
  /**
   * Get seller review metrics for a user
   */
  async getSellerMetrics(userId: string): Promise<UserReviewMetrics> {
    const response = await apiClient.get<UserReviewMetrics>(`/reviews/seller/${userId}`);
    return response.data;
  },

  /**
   * Get buyer review metrics for a user
   */
  async getBuyerMetrics(userId: string): Promise<UserReviewMetrics> {
    const response = await apiClient.get<UserReviewMetrics>(`/reviews/buyer/${userId}`);
    return response.data;
  },

  /**
   * Create a review for a transaction
   */
  async createReview(request: CreateReviewRequest): Promise<Review> {
    const response = await apiClient.post<Review>('/reviews', request);
    return response.data;
  },

  /**
   * Get reviews for a transaction
   */
  async getTransactionReviews(transactionId: string): Promise<TransactionReviewsResponse> {
    const response = await apiClient.get<TransactionReviewsResponse>(
      `/reviews/transaction/${transactionId}`
    );
    return response.data;
  },
};

export default reviewsService;
