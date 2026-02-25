import type {
  PaymentConfirmation,
  PaymentConfirmationStatus,
} from './payment-confirmations.domain';

/**
 * Response after uploading a payment confirmation
 */
export interface UploadPaymentConfirmationResponse {
  confirmation: PaymentConfirmation;
}

/**
 * Get payment confirmation for a transaction
 */
export interface GetPaymentConfirmationResponse {
  confirmation: PaymentConfirmation | null;
}

/**
 * Payment confirmation with transaction context (for admin list)
 */
export interface PaymentConfirmationWithTransaction extends PaymentConfirmation {
  buyerName: string;
  sellerName: string;
  eventName: string;
  transactionAmount: number;
  transactionCurrency: string;
}

/**
 * Response for listing confirmations (admin)
 */
export interface ListPaymentConfirmationsResponse {
  confirmations: PaymentConfirmationWithTransaction[];
  total: number;
}

/**
 * Request to update confirmation status (admin)
 */
export interface UpdateConfirmationStatusRequest {
  status: 'Accepted' | 'Rejected';
  adminNotes?: string;
  /** If true, also approve/reject the associated transaction. Defaults to true. */
  updateTransaction?: boolean;
}

/**
 * Response after updating confirmation status
 */
export type UpdateConfirmationStatusResponse = PaymentConfirmation;
