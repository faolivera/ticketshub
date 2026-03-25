import type { TransactionWithDetails } from './transactions';
import type { OfferWithListingSummary, OfferWithReceivedContext } from './offers';
import type { PaymentConfirmation } from './payment-confirmations';
import type { Review } from './reviews';
import type { BankTransferConfig } from './tickets';

/**
 * Ticket unit info for transaction details (id + optional seat for numbered tickets)
 */
export interface TransactionTicketUnit {
  id: string;
  seat?: { row: string; seatNumber: string };
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
 * Sell-ticket config response (platform fee % and optional active promotion)
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
 */
export interface ValidateSellListingRequest {
  eventDateId?: string;
  validations: ('proximity' | 'limits')[];
  quantity: number;
  pricePerTicket: { amount: number; currency: string };
}

/**
 * Discriminated result of sell listing validation.
 */
export type ValidateSellListingResponse =
  | { status: 'can_create' }
  | { status: 'date_proximity_restriction' }
  | { status: 'listing_limits_restriction' };

/** GET /api/activity-history */
export type ActivityHistoryItem =
  | { type: 'transaction'; transaction: TransactionWithDetails }
  | { type: 'offer'; offer: OfferWithListingSummary | OfferWithReceivedContext };

export interface GetActivityHistoryResponse {
  items: ActivityHistoryItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

/**
 * Chat config when user is participant and chat is visible (enabled or only_read).
 * - enabled: full chat with send
 * - only_read: chat visible, read-only; button shows "Read conversation"
 */
export interface TransactionDetailsChatConfig {
  chatMode: 'enabled' | 'only_read';
  chatPollIntervalSeconds: number;
  chatMaxMessages: number;
  /** True when the current user has unread messages from the other party */
  hasUnreadMessages: boolean;
  /** True when buyer and seller have exchanged at least one user message (excludes system/delivery e.g. "ticket sent") */
  hasExchangedMessages: boolean;
}

/**
 * Get transaction details response (BFF aggregation)
 * Combines transaction, payment confirmation, reviews data.
 */
export interface GetTransactionDetailsResponse {
  transaction: TransactionWithDetails;
  paymentConfirmation: PaymentConfirmation | null;
  reviews: TransactionReviewsData | null;
  bankTransferConfig: BankTransferConfig | null;
  ticketUnits: TransactionTicketUnit[];
  /** Public display name of the payment method (e.g. "Transferencia Bancaria") */
  paymentMethodPublicName: string | null;
  /** Present when user is buyer/seller and chat is allowed for this transaction */
  chat?: TransactionDetailsChatConfig;
}
