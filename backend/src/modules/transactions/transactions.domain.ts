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
 * How the seller sent the ticket to the buyer (for delivery tracking).
 */
export type SellerSentPayloadType = 'ticketera' | 'pdf_or_image' | 'other';

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
  /** Admin manually cancelled the transaction */
  AdminCancelled = 'AdminCancelled',
}

/**
 * Chat UI state for the transaction details page.
 * - disabled: no chat button, no chat panel
 * - enabled: full chat with send
 * - only_read: chat visible, read-only (no send); backend rejects new messages
 */
export type TransactionChatMode = 'disabled' | 'enabled' | 'only_read';

/**
 * Maps transaction status to chat mode for the transaction details page.
 * Adjust this mapping to change when chat is shown and whether sending is allowed.
 */
export const TRANSACTION_CHAT_MODE: Record<
  TransactionStatus,
  TransactionChatMode
> = {
  [TransactionStatus.PendingPayment]: 'disabled',
  [TransactionStatus.PaymentPendingVerification]: 'disabled',
  [TransactionStatus.PaymentReceived]: 'enabled',
  [TransactionStatus.TicketTransferred]: 'enabled',
  [TransactionStatus.DepositHold]: 'only_read',
  [TransactionStatus.TransferringFund]: 'only_read',
  [TransactionStatus.Completed]: 'only_read',
  [TransactionStatus.Disputed]: 'disabled',
  [TransactionStatus.Refunded]: 'disabled',
  [TransactionStatus.Cancelled]: 'disabled',
};

export function getTransactionChatMode(
  status: TransactionStatus,
): TransactionChatMode {
  return TRANSACTION_CHAT_MODE[status];
}

/** True when user can open chat and read messages (enabled or only_read). */
export function canReadTransactionChat(status: TransactionStatus): boolean {
  const mode = getTransactionChatMode(status);
  return mode === 'enabled' || mode === 'only_read';
}

/** True when user can send messages (only when chat is enabled). */
export function canSendTransactionChat(status: TransactionStatus): boolean {
  return getTransactionChatMode(status) === 'enabled';
}

/**
 * Mapping of transaction status to required actor
 */
export const STATUS_REQUIRED_ACTOR: Record<TransactionStatus, RequiredActor> = {
  [TransactionStatus.PendingPayment]: RequiredActor.Buyer,
  [TransactionStatus.PaymentPendingVerification]: RequiredActor.Platform,
  [TransactionStatus.PaymentReceived]: RequiredActor.Seller,
  [TransactionStatus.TicketTransferred]: RequiredActor.Buyer,
  [TransactionStatus.DepositHold]: RequiredActor.None,
  [TransactionStatus.TransferringFund]: RequiredActor.Platform,
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
  /** How the seller sent the ticket. Set when seller confirms transfer. */
  sellerSentPayloadType?: SellerSentPayloadType;
  /** Free text when sellerSentPayloadType is 'other'. */
  sellerSentPayloadTypeOtherText?: string;
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

  /** Email the buyer wants to use for ticket delivery. Null until buyer confirms it. Locked after set. */
  buyerDeliveryEmail: string | null;

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

  /** Optional proof file storage key (seller confirms transfer) */
  transferProofStorageKey?: string;
  /** Original filename of transfer proof for display */
  transferProofOriginalFilename?: string;
  /** Optional proof file storage key (buyer confirms receipt) */
  receiptProofStorageKey?: string;
  /** Original filename of receipt proof for display */
  receiptProofOriginalFilename?: string;

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
  /** Listing section (or ticket type fallback) for seller/buyer dashboards */
  sectionName: string;
  buyerName: string;
  sellerName: string;
  buyerPic: string | null;
  sellerPic: string | null;
  bannerUrls?: BannerUrls;
}

/** Allowed MIME types for transfer/receipt proof uploads (images and PDF) */
export const PROOF_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
] as const;

export type ProofFileMimeType = (typeof PROOF_ALLOWED_MIME_TYPES)[number];

/** Max file size for proof uploads: 5MB */
export const PROOF_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
