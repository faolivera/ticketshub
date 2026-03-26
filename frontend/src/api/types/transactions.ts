import type { Address, Money } from './common';
import type { TicketType, DeliveryMethod, TicketListingWithEvent } from './tickets';

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
   * Buyer confirmed receipt; funds held until depositReleaseAt (24h after event)
   */
  DepositHold = 'DepositHold',

  /**
   * Past depositReleaseAt; awaiting admin to pay seller and mark Completed
   */
  TransferringFund = 'TransferringFund',

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
  BuyerCancelled = 'BuyerCancelled',
  PaymentFailed = 'PaymentFailed',
  PaymentTimeout = 'PaymentTimeout',
  AdminRejected = 'AdminRejected',
  AdminReviewTimeout = 'AdminReviewTimeout',
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

  // Pricing breakdown (BFF view: single servicePrice for buyer, no commission breakdown)
  ticketPrice: Money;
  servicePrice: Money;
  /** Only present when the requester is the seller (or admin) */
  sellerPlatformFee?: Money;
  totalPaid: Money;
  /** Only present when the requester is the seller (or admin) */
  sellerReceives?: Money;

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
  /** How the seller sent the ticket. Set when seller confirms transfer. */
  sellerSentPayloadType?: 'ticketera' | 'pdf_or_image' | 'other';
  /** Free text when sellerSentPayloadType is 'other'. */
  sellerSentPayloadTypeOtherText?: string;
  buyerConfirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: RequiredActor;
  cancellationReason?: CancellationReason;
  refundedAt?: Date;

  // Expiration timers
  paymentExpiresAt: string;
  adminReviewExpiresAt?: string;

  /** When escrow can transition to TransferringFund (event + 24h) */
  depositReleaseAt?: Date;

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

  /** Transfer proof file (seller); set when uploaded after transfer */
  transferProofStorageKey?: string;
  transferProofOriginalFilename?: string;
  /** Receipt proof file (buyer); set when confirming receipt */
  receiptProofStorageKey?: string;
  receiptProofOriginalFilename?: string;

  updatedAt: Date;
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
  /** Listing section (or type fallback); present when API includes it */
  sectionName?: string;
  buyerName: string;
  sellerName: string;
  buyerPic: string | null;
  sellerPic: string | null;
  buyerDeliveryEmail: string | null;
  bannerUrls?: BannerUrls;
}

// === API Types ===

/**
 * Request to initiate a purchase.
 * When offerId is set, price and ticket selection come from the offer; ticketUnitIds and pricingSnapshotId can be omitted.
 */
export interface InitiatePurchaseRequest {
  listingId: string;
  ticketUnitIds?: string[];
  paymentMethodId: string;
  pricingSnapshotId?: string;
  offerId?: string;
}

/**
 * Response after initiating purchase.
 * Only transaction.id is used by the frontend (redirect); full display data comes from BFF.
 */
export interface InitiatePurchaseResponse {
  transaction: { id: string };
  paymentIntentId: string;
  clientSecret?: string;
}

/**
 * Request to confirm ticket transfer
 */
export interface ConfirmTransferRequest {
  transferProof?: string;
  transferProofOriginalFilename?: string;
  /** How the seller sent the ticket (for delivery tracking). */
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
  receiptProof?: string;
  receiptProofOriginalFilename?: string;
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

/** Transaction chat: sender role for display */
export type TransactionChatSenderRole = 'buyer' | 'seller';

/** Chat message type: regular text or structured delivery event */
export type TransactionChatMessageType = 'text' | 'delivery';

/** Single message in transaction chat */
export interface TransactionChatMessage {
  id: string;
  senderId: string;
  senderRole: TransactionChatSenderRole;
  content: string;
  messageType?: TransactionChatMessageType;
  payloadType?: string | null;
  createdAt: string;
}

/** Response for GET /api/transactions/:id/chat/messages */
export interface GetTransactionChatMessagesResponse {
  messages: TransactionChatMessage[];
}
