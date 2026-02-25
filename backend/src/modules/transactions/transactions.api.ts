import type {
  Transaction,
  TransactionWithDetails,
} from './transactions.domain';
import type { PaymentMethodId } from '../payments/payments.domain';

/**
 * Request to initiate a purchase
 */
export interface InitiatePurchaseRequest {
  listingId: string;
  ticketUnitIds: string[];
  paymentMethodId: PaymentMethodId;
}

/**
 * Response after initiating purchase
 */
export interface InitiatePurchaseResponse {
  transaction: Transaction;
  paymentIntentId: string;
  clientSecret?: string; // For client-side payment
}

/**
 * Request to confirm ticket transfer
 */
export interface ConfirmTransferRequest {
  transferProof?: string; // URL to proof image/document
}

/**
 * Response after confirming transfer
 */
export type ConfirmTransferResponse = Transaction;

/**
 * Request to confirm receipt
 */
export interface ConfirmReceiptRequest {
  confirmed: boolean;
}

/**
 * Response after confirming receipt
 */
export type ConfirmReceiptResponse = Transaction;

/**
 * Response for getting transaction details
 */
export type GetTransactionResponse = TransactionWithDetails;

/**
 * Response for listing transactions
 */
export type ListTransactionsResponse = TransactionWithDetails[];

/**
 * Query params for listing transactions
 */
export interface ListTransactionsQuery {
  status?: string;
  role?: 'buyer' | 'seller';
  limit?: number;
  offset?: number;
}

/**
 * Transaction with payment method info for admin view
 */
export interface TransactionWithPaymentInfo extends TransactionWithDetails {
  paymentMethodId?: PaymentMethodId;
  paymentMethodName: string;
}

/**
 * Response for getting pending manual payments
 */
export interface GetPendingPaymentsResponse {
  transactions: TransactionWithPaymentInfo[];
  total: number;
}

/**
 * Request to approve/reject manual payment
 */
export interface ApprovePaymentRequest {
  approved: boolean;
  rejectionReason?: string;
}

/**
 * Response after payment approval action
 */
export type ApprovePaymentResponse = Transaction;
