import type { CurrencyCode } from '../shared/money.domain';
import type { Address } from '../shared/address.domain';
import type { TicketType, DeliveryMethod } from '../tickets/tickets.domain';
import type { PaymentMethodId } from '../payments/payments.domain';

/**
 * Money representation
 */
export interface Money {
  amount: number; // in cents
  currency: CurrencyCode;
}

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
  ticketPrice: Money; // Price per ticket * quantity
  buyerFee: Money; // Platform fee from buyer
  sellerFee: Money; // Platform fee from seller
  totalPaid: Money; // ticketPrice + buyerFee
  sellerReceives: Money; // ticketPrice - sellerFee

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
  paymentMethodId?: PaymentMethodId;

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
