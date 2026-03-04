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
 * Chat config when user is participant and transaction status allows chat.
 */
export interface TransactionDetailsChatConfig {
  chatAllowed: true;
  chatPollIntervalSeconds: number;
  chatMaxMessages: number;
  /** True when the current user has unread messages from the other party */
  hasUnreadMessages: boolean;
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
