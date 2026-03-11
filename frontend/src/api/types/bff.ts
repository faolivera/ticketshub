import type { TransactionWithDetails } from './transactions';
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
  };
}

/**
 * Request for POST /api/sell/validate (listing snapshot for risk validation).
 */
export interface ValidateSellListingRequest {
  quantity: number;
  pricePerTicket: { amount: number; currency: string };
}

/**
 * Result of sell listing validation (same risk checks as createListing for Tier 0 sellers).
 */
export type ValidateSellListingResponse =
  | { status: 'can_create' }
  | { status: 'seller_risk_restriction' };

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
  /** Buyer email, present when the requester is the seller (for transfer confirmation disclaimer) */
  counterpartyEmail?: string;
}
