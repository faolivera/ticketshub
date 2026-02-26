import type { TicketListingWithEvent } from '../tickets/tickets.domain';
import type { TransactionWithDetails } from '../transactions/transactions.domain';
import type { PaymentConfirmation } from '../payment-confirmations/payment-confirmations.domain';
import type { Review } from '../reviews/reviews.domain';
import type {
  SellerProfile,
  ListingWithSeller,
  BuyPageData,
} from './bff.domain';

export interface GetMyTicketsData {
  bought: TransactionWithDetails[];
  sold: TransactionWithDetails[];
  listed: TicketListingWithEvent[];
}

/**
 * Get seller profile response
 */
export type GetSellerProfileResponse = SellerProfile;

/**
 * Get my tickets response
 */
export type GetMyTicketsResponse = GetMyTicketsData;

/**
 * Get event listings with seller info response
 */
export type GetEventListingsResponse = ListingWithSeller[];

/**
 * Query params for getting event listings
 */
export interface GetEventListingsQuery {
  eventId: string;
}

/**
 * Get buy page response (listing + seller + payment methods)
 */
export type GetBuyPageResponse = BuyPageData;

/**
 * Transaction reviews data for the transaction details page
 */
export interface TransactionReviewsData {
  buyerReview: Review | null;
  sellerReview: Review | null;
  canReview: boolean;
}

/**
 * Get transaction details response (aggregated data for transaction page)
 */
export interface GetTransactionDetailsResponse {
  transaction: TransactionWithDetails;
  paymentConfirmation: PaymentConfirmation | null;
  reviews: TransactionReviewsData | null;
}
