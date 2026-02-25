/**
 * Payment confirmation status
 */
export enum PaymentConfirmationStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}

/**
 * Payment confirmation entity
 */
export interface PaymentConfirmation {
  id: string;
  transactionId: string;
  uploadedBy: string;
  storageKey: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  status: PaymentConfirmationStatus;
  adminNotes?: string;
  reviewedBy?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

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
