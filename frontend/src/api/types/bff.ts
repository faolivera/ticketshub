import type { TransactionWithDetails } from './transactions';
import type { PaymentConfirmation } from './payment-confirmations';
import type { Review } from './reviews';

/**
 * Transaction reviews data for the transaction details page
 */
export interface TransactionReviewsData {
  buyerReview: Review | null;
  sellerReview: Review | null;
  canReview: boolean;
}

/**
 * Get transaction details response (BFF aggregation)
 * Combines transaction, payment confirmation, and reviews data.
 */
export interface GetTransactionDetailsResponse {
  transaction: TransactionWithDetails;
  paymentConfirmation: PaymentConfirmation | null;
  reviews: TransactionReviewsData | null;
}
