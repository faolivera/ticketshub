import type { CurrencyCode } from '../shared/money.domain';
import type { Address } from '../shared/address.domain';
import type { TicketType, DeliveryMethod } from '../tickets/tickets.domain';

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
   * Transaction created, waiting for buyer to make payment
   */
  PendingPayment = 'PendingPayment',

  /**
   * Payment submitted by buyer, waiting for platform verification (manual payments only)
   */
  PaymentPendingVerification = 'PaymentPendingVerification',

  /**
   * Payment received and verified, funds in escrow, waiting for seller to transfer ticket
   */
  PaymentReceived = 'PaymentReceived',

  /**
   * Seller has transferred the ticket, waiting for buyer confirmation
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
 * Actor required to advance the transaction to the next status
 */
export enum RequiredActor {
  Buyer = 'Buyer',
  Seller = 'Seller',
  Platform = 'Platform',
  None = 'None',
}

/**
 * Reason why a transaction was cancelled
 */
export enum CancellationReason {
  /** Buyer manually cancelled the transaction */
  BuyerCancelled = 'BuyerCancelled',
  /** Payment gateway returned a failure */
  PaymentFailed = 'PaymentFailed',
  /** Payment window (10 min) expired */
  PaymentTimeout = 'PaymentTimeout',
  /** Admin rejected the payment confirmation */
  AdminRejected = 'AdminRejected',
  /** Admin did not review within 24 hours */
  AdminReviewTimeout = 'AdminReviewTimeout',
}

/**
 * Mapping of transaction status to required actor
 */
export const STATUS_REQUIRED_ACTOR: Record<TransactionStatus, RequiredActor> = {
  [TransactionStatus.PendingPayment]: RequiredActor.Buyer,
  [TransactionStatus.PaymentPendingVerification]: RequiredActor.Platform,
  [TransactionStatus.PaymentReceived]: RequiredActor.Seller,
  [TransactionStatus.TicketTransferred]: RequiredActor.Buyer,
  [TransactionStatus.Completed]: RequiredActor.None,
  [TransactionStatus.Disputed]: RequiredActor.Platform,
  [TransactionStatus.Refunded]: RequiredActor.None,
  [TransactionStatus.Cancelled]: RequiredActor.None,
};

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
  buyerPlatformFee: Money; // Platform fee charged to buyer
  sellerPlatformFee: Money; // Platform fee charged to seller
  paymentMethodCommission: Money; // Commission from selected payment method
  totalPaid: Money; // ticketPrice + buyerPlatformFee + paymentMethodCommission
  sellerReceives: Money; // ticketPrice - sellerPlatformFee

  // Pricing snapshot reference
  pricingSnapshotId: string;

  /** Set when the purchase was made from an accepted offer */
  offerId?: string;

  status: TransactionStatus;

  /** Actor required to advance the transaction to the next status */
  requiredActor: RequiredActor;

  // Timeline
  createdAt: Date;
  paymentReceivedAt?: Date;
  ticketTransferredAt?: Date;
  buyerConfirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  /** Who cancelled the transaction */
  cancelledBy?: RequiredActor;

  /** Why the transaction was cancelled */
  cancellationReason?: CancellationReason;

  /** When the payment window expires (createdAt + 10 min) */
  paymentExpiresAt: Date;

  /** When admin review expires (set when confirmation uploaded, +24h) */
  adminReviewExpiresAt?: Date;

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

  /** Optimistic locking version for concurrency control */
  version: number;
}

/**
 * Banner URLs for display
 */
export interface BannerUrls {
  square?: string;
  rectangle?: string;
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
  bannerUrls?: BannerUrls;
}
