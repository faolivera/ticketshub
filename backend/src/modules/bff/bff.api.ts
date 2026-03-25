import type { PublicTicketListingWithEvent } from '../tickets/tickets.domain';
import type { TransactionWithDetails } from '../transactions/transactions.domain';
import type {
  OfferWithListingSummary,
  OfferWithReceivedContext,
} from '../offers/offers.api';
import type { PaymentConfirmation } from '../payment-confirmations/payment-confirmations.domain';
import type { Review } from '../reviews/reviews.domain';
import type { BankTransferConfig } from '../payments/payments.domain';
import type { Money } from '../transactions/transactions.domain';
import type { CurrencyCode } from '../shared/money.domain';
import type { SellerProfile, EventPageData, BuyPageData } from './bff.domain';

/**
 * Transaction view for buyer-facing BFF: single "service price" (platform + payment method commission).
 * Backend keeps full breakdown internally; this shape hides it from the frontend.
 */
export type BffTransactionWithDetails = Omit<
  TransactionWithDetails,
  'buyerPlatformFee' | 'paymentMethodCommission' | 'sellerPlatformFee' | 'sellerReceives'
> & {
  /** Combined buyer fee: buyerPlatformFee + paymentMethodCommission (single line for buyer UI) */
  servicePrice: Money;
  /** Only present when the requester is the seller (or admin) */
  sellerPlatformFee?: Money;
  /** Only present when the requester is the seller (or admin) */
  sellerReceives?: Money;
};

export interface GetMyTicketsData {
  bought: BffTransactionWithDetails[];
  sold: BffTransactionWithDetails[];
  listed: PublicTicketListingWithEvent[];
}

/**
 * Get seller profile response
 */
export type GetSellerProfileResponse = SellerProfile;

/**
 * Get my tickets response
 */
export type GetMyTicketsResponse = GetMyTicketsData;

/** Paginated terminal transactions + closed offers for buyer or seller activity history. */
export type ActivityHistoryItem =
  | { type: 'transaction'; transaction: BffTransactionWithDetails }
  | {
      type: 'offer';
      offer: OfferWithListingSummary | OfferWithReceivedContext;
    };

export interface GetActivityHistoryData {
  items: ActivityHistoryItem[];
  hasMore: boolean;
  /** Opaque cursor for the next page; null when hasMore is false */
  nextCursor: string | null;
}

export type GetActivityHistoryResponse = GetActivityHistoryData;

/**
 * Get event page data response (event + enriched listings)
 */
export type GetEventPageResponse = EventPageData;

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
 * Response for GET /api/buy/:ticketId/checkout-risk (re-evaluate risk for quantity + payment method).
 */
export interface GetCheckoutRiskResponse {
  checkoutRisk: BuyPageData['checkoutRisk'];
}

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
    promoLabel: string;
  };
}

/**
 * Request for POST /api/sell/validate.
 * validations: which checks to run. 'proximity' requires eventDateId.
 * quantity and pricePerTicket are always required (use amount:0 when only checking proximity).
 */
export interface ValidateSellListingRequest {
  eventDateId?: string;
  validations: ('proximity' | 'limits')[];
  quantity: number;
  pricePerTicket: { amount: number; currency: CurrencyCode };
}

/**
 * Discriminated result of sell listing validation.
 * date_proximity_restriction: event is too close in time for unverified sellers.
 * listing_limits_restriction: listing would exceed unverified seller monetary/count caps.
 */
export type ValidateSellListingResponse =
  | { status: 'can_create' }
  | { status: 'date_proximity_restriction' }
  | { status: 'listing_limits_restriction' };

/**
 * Chat config when the user is a participant and chat is visible (enabled or only_read).
 * - enabled: full chat with send
 * - only_read: chat visible, read-only (backend rejects new messages)
 */
export interface TransactionDetailsChatConfig {
  /** When 'only_read', UI shows "Read conversation" and disables sending */
  chatMode: 'enabled' | 'only_read';
  chatPollIntervalSeconds: number;
  chatMaxMessages: number;
  /** True when the current user has unread messages from the other party */
  hasUnreadMessages: boolean;
  /** True when buyer and seller have exchanged at least one user message (excludes system/delivery e.g. "ticket sent") */
  hasExchangedMessages: boolean;
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
