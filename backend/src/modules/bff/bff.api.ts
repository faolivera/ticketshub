import type { TicketListingWithEvent } from '../tickets/tickets.domain';
import type { TransactionWithDetails } from '../transactions/transactions.domain';
import type { PaymentConfirmation } from '../payment-confirmations/payment-confirmations.domain';
import type { Review } from '../reviews/reviews.domain';
import type { BankTransferConfig } from '../payments/payments.domain';
import type { Money } from '../transactions/transactions.domain';
import type {
  SellerProfile,
  ListingWithSeller,
  BuyPageData,
} from './bff.domain';

/**
 * Transaction view for buyer-facing BFF: single "service price" (platform + payment method commission).
 * Backend keeps full breakdown internally; this shape hides it from the frontend.
 */
export type BffTransactionWithDetails = Omit<
  TransactionWithDetails,
  'buyerPlatformFee' | 'paymentMethodCommission'
> & {
  /** Combined buyer fee: buyerPlatformFee + paymentMethodCommission (single line for buyer UI) */
  servicePrice: Money;
};

export interface GetMyTicketsData {
  bought: BffTransactionWithDetails[];
  sold: BffTransactionWithDetails[];
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
 * Ticket unit info for transaction details (id + optional seat for numbered tickets)
 */
export interface TransactionTicketUnit {
  id: string;
  seat?: { row: string; seatNumber: string };
}

/**
 * Sell-ticket config response (platform fee % and optional active promotion for seller)
 */
export interface GetSellTicketConfigResponse {
  sellerPlatformFeePercentage: number;
  activePromotion?: {
    id: string;
    name: string;
    type: string;
    config: { feePercentage: number };
  };
}

/**
 * Chat config included when the user is a participant and chat is allowed (PaymentReceived | TicketTransferred).
 */
export interface TransactionDetailsChatConfig {
  chatAllowed: true;
  chatPollIntervalSeconds: number;
  chatMaxMessages: number;
  /** True when the current user has unread messages from the other party */
  hasUnreadMessages: boolean;
}

/**
 * Get transaction details response (aggregated data for transaction page).
 * Transaction uses BFF view with servicePrice (no buyer commission breakdown).
 */
export interface GetTransactionDetailsResponse {
  transaction: BffTransactionWithDetails;
  paymentConfirmation: PaymentConfirmation | null;
  reviews: TransactionReviewsData | null;
  bankTransferConfig: BankTransferConfig | null;
  /** Ticket units in this transaction (with seat info when numbered) */
  ticketUnits: TransactionTicketUnit[];
  /** Public display name of the payment method (e.g. "Transferencia Bancaria") */
  paymentMethodPublicName: string | null;
  /** Present when user is buyer/seller and transaction status allows chat */
  chat?: TransactionDetailsChatConfig;
}
