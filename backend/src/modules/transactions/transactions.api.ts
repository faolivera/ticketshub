import { z } from 'zod';
import type {
  Transaction,
  TransactionWithDetails,
} from './transactions.domain';

/**
 * Request to initiate a purchase.
 * When offerId is set, the purchase uses the accepted offer's price; ticketUnitIds and pricingSnapshotId are derived and can be omitted.
 */
export interface InitiatePurchaseRequest {
  listingId: string;
  /** Required when buying at list price; ignored when offerId is set */
  ticketUnitIds?: string[];
  paymentMethodId: string;
  /** Required when buying at list price; ignored when offerId is set */
  pricingSnapshotId?: string;
  /** When set, purchase is for an accepted offer (price and units come from the offer) */
  offerId?: string;
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
  /** Storage key from POST /transactions/:id/transfer-proof upload (optional) */
  transferProof?: string;
  /** Original filename for display when transferProof is provided */
  transferProofOriginalFilename?: string;
  /** How the seller sent the ticket. Used for delivery tracking. */
  payloadType?: 'ticketera' | 'pdf_or_image' | 'other';
  /** Free text when payloadType is 'other'. */
  payloadTypeOtherText?: string;
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
  /** Storage key from POST /transactions/:id/receipt-proof upload (optional) */
  receiptProof?: string;
  /** Original filename for display when receiptProof is provided */
  receiptProofOriginalFilename?: string;
}

/**
 * Response after confirming receipt
 */
export type ConfirmReceiptResponse = Transaction;

/**
 * Response after uploading transfer proof
 */
export interface UploadTransferProofResponse {
  storageKey: string;
}

/**
 * Response after uploading receipt proof
 */
export interface UploadReceiptProofResponse {
  storageKey: string;
}

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
  paymentMethodId?: string;
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

export const SetBuyerDeliveryEmailSchema = z.object({
  email: z.string().email().max(254),
});

export type SetBuyerDeliveryEmailRequest = z.infer<typeof SetBuyerDeliveryEmailSchema>;

export type SetBuyerDeliveryEmailResponse = Omit<TransactionWithDetails, 'buyerPlatformFee' | 'paymentMethodCommission'>;
