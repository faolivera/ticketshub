import type { Address, Money } from './common';
import type { TicketType, DeliveryMethod, TicketListingWithEvent } from './tickets';

/**
 * Transaction status - represents the escrow lifecycle
 */
export enum TransactionStatus {
  /**
   * Transaction created, waiting for payment
   */
  PendingPayment = 'PendingPayment',

  /**
   * Payment received, funds in escrow
   */
  PaymentReceived = 'PaymentReceived',

  /**
   * Seller has transferred the ticket
   */
  TicketTransferred = 'TicketTransferred',

  /**
   * Transaction completed, payment released to seller
   */
  Completed = 'Completed',

  /**
   * Dispute opened by buyer
   */
  Disputed = 'Disputed',

  /**
   * Payment refunded to buyer
   */
  Refunded = 'Refunded',

  /**
   * Transaction cancelled
   */
  Cancelled = 'Cancelled',
}

/**
 * Transaction entity - represents a purchase
 */
export interface Transaction {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;

  ticketType: TicketType;
  ticketUnitIds: string[];
  quantity: number;

  // Pricing breakdown
  ticketPrice: Money;
  buyerFee: Money;
  sellerFee: Money;
  totalPaid: Money;
  sellerReceives: Money;

  status: TransactionStatus;

  // Timeline
  createdAt: Date;
  paymentReceivedAt?: Date;
  ticketTransferredAt?: Date;
  buyerConfirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;

  // For Digital Non-Transferable tickets
  eventDateTime?: Date;
  releaseAfterMinutes?: number;
  autoReleaseAt?: Date;

  // Physical delivery details
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;

  // Dispute reference
  disputeId?: string;

  // Payment method used for this transaction
  paymentMethodId?: string;

  // Payment confirmation for manual payment methods
  paymentConfirmationId?: string;

  // Admin approval for manual payments
  paymentApprovedBy?: string;
  paymentApprovedAt?: Date;

  updatedAt: Date;
}

/**
 * Transaction with additional display info
 */
export interface TransactionWithDetails extends Transaction {
  eventName: string;
  eventDate: Date;
  venue: string;
  buyerName: string;
  sellerName: string;
}

// === API Types ===

/**
 * Request to initiate a purchase
 */
export interface InitiatePurchaseRequest {
  listingId: string;
  ticketUnitIds: string[];
}

/**
 * Response after initiating purchase
 */
export interface InitiatePurchaseResponse {
  transaction: Transaction;
  paymentIntentId: string;
  clientSecret?: string;
}

/**
 * Request to confirm ticket transfer
 */
export interface ConfirmTransferRequest {
  transferProof?: string;
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
 * Response from the BFF my-tickets endpoint (bought, sold, listed)
 */
export interface GetMyTicketsResponse {
  bought: TransactionWithDetails[];
  sold: TransactionWithDetails[];
  listed: TicketListingWithEvent[];
}
