/**
 * Typed contexts for each notification event type.
 * Each event type has its own context interface defining the data
 * needed to process the notification and render templates.
 */

import { NotificationEventType } from './notifications.domain';
import { CancellationReason } from '../transactions/transactions.domain';
import type { OfferExpiredReason } from '../offers/offers.domain';

// ============================================================================
// TRANSACTION CONTEXTS
// ============================================================================

export interface BuyerPaymentSubmittedContext {
  transactionId: string;
  ticketId: string;
  eventName: string;
  amount: number;
  currency: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
}

export interface PaymentReceivedContext {
  transactionId: string;
  ticketId: string;
  eventName: string;
  buyerId: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  currency: string;
  ticketCount: number;
}

export interface BuyerPaymentRejectedContext {
  transactionId: string;
  ticketId: string;
  eventName: string;
  buyerId: string;
  sellerId: string;
  sellerName: string;
  rejectionReason?: string;
}

export interface TicketTransferredContext {
  transactionId: string;
  ticketId: string;
  eventName: string;
  eventDate: string;
  venue: string;
  buyerId: string;
  sellerId: string;
}

export interface TransactionCompletedContext {
  transactionId: string;
  ticketId: string;
  eventName: string;
  amount: number;
  currency: string;
  buyerId: string;
  sellerId: string;
}

export { CancellationReason };

export interface TransactionCancelledContext {
  transactionId: string;
  ticketId: string;
  eventName: string;
  buyerId: string;
  sellerId: string;
  cancelledBy: 'buyer' | 'seller' | 'system';
  cancellationReason: CancellationReason;
}

// ============================================================================
// DISPUTE CONTEXTS
// ============================================================================

export interface DisputeOpenedContext {
  transactionId: string;
  disputeId: string;
  eventName: string;
  buyerId: string;
  sellerId: string;
  openedBy: 'buyer' | 'seller';
  reason: string;
}

export interface DisputeResolvedContext {
  transactionId: string;
  disputeId: string;
  eventName: string;
  buyerId: string;
  sellerId: string;
  resolution: string;
  resolvedInFavorOf: 'buyer' | 'seller';
}

// ============================================================================
// IDENTITY VERIFICATION CONTEXTS
// ============================================================================

export interface IdentityVerifiedContext {
  userId: string;
  userName: string;
}

export interface IdentityRejectedContext {
  userId: string;
  userName: string;
  rejectionReason: string;
}

/** Emitted when user submits identity documents for review. Recipients: admins. */
export interface IdentitySubmittedContext {
  userId: string;
  userName: string;
}

/** Emitted when user submits bank account for review. Recipients: admins. */
export interface BankAccountSubmittedContext {
  userId: string;
  userName: string;
}

/** Emitted when both identity and bank are approved (seller verification complete). Recipients: the seller. */
export interface SellerVerificationCompleteContext {
  userId: string;
  userName: string;
}

// ============================================================================
// EVENT CONTEXTS
// ============================================================================

export interface EventApprovedContext {
  eventId: string;
  eventSlug: string;
  eventName: string;
  organizerId: string;
}

export interface EventRejectedContext {
  eventId: string;
  eventSlug: string;
  eventName: string;
  organizerId: string;
  rejectionReason: string;
}

// ============================================================================
// REVIEW CONTEXTS
// ============================================================================

export interface ReviewReceivedContext {
  reviewId: string;
  transactionId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: string; // 'positive' | 'negative' | 'neutral'
  comment?: string;
}

// ============================================================================
// OFFER CONTEXTS
// ============================================================================

export interface OfferReceivedContext {
  offerId: string;
  listingId: string;
  eventName: string;
  sellerId: string;
  offeredAmount: number;
  currency: string;
}

export interface OfferAcceptedContext {
  offerId: string;
  listingId: string;
  eventName: string;
  buyerId: string;
  offeredAmount: number;
  currency: string;
}

export interface OfferRejectedContext {
  offerId: string;
  listingId: string;
  eventName: string;
  buyerId: string;
}

export interface OfferCancelledContext {
  offerId: string;
  listingId: string;
  eventName: string;
  buyerId: string;
  reason?: string;
}

export interface OfferExpiredContext {
  offerId: string;
  listingId: string;
  eventName: string;
  buyerId: string;
  sellerId: string;
  expiredReason: OfferExpiredReason;
}

// ============================================================================
// TYPE MAP
// ============================================================================

/**
 * Maps each event type to its context interface for compile-time type safety.
 */
export interface NotificationContextMap {
  [NotificationEventType.BUYER_PAYMENT_SUBMITTED]: BuyerPaymentSubmittedContext;
  [NotificationEventType.PAYMENT_RECEIVED]: PaymentReceivedContext;
  [NotificationEventType.BUYER_PAYMENT_REJECTED]: BuyerPaymentRejectedContext;
  [NotificationEventType.TICKET_TRANSFERRED]: TicketTransferredContext;
  [NotificationEventType.TRANSACTION_COMPLETED]: TransactionCompletedContext;
  [NotificationEventType.TRANSACTION_CANCELLED]: TransactionCancelledContext;
  [NotificationEventType.DISPUTE_OPENED]: DisputeOpenedContext;
  [NotificationEventType.DISPUTE_RESOLVED]: DisputeResolvedContext;
  [NotificationEventType.IDENTITY_VERIFIED]: IdentityVerifiedContext;
  [NotificationEventType.IDENTITY_REJECTED]: IdentityRejectedContext;
  [NotificationEventType.IDENTITY_SUBMITTED]: IdentitySubmittedContext;
  [NotificationEventType.BANK_ACCOUNT_SUBMITTED]: BankAccountSubmittedContext;
  [NotificationEventType.SELLER_VERIFICATION_COMPLETE]: SellerVerificationCompleteContext;
  [NotificationEventType.EVENT_APPROVED]: EventApprovedContext;
  [NotificationEventType.EVENT_REJECTED]: EventRejectedContext;
  [NotificationEventType.REVIEW_RECEIVED]: ReviewReceivedContext;
  [NotificationEventType.OFFER_RECEIVED]: OfferReceivedContext;
  [NotificationEventType.OFFER_ACCEPTED]: OfferAcceptedContext;
  [NotificationEventType.OFFER_REJECTED]: OfferRejectedContext;
  [NotificationEventType.OFFER_CANCELLED]: OfferCancelledContext;
  [NotificationEventType.OFFER_EXPIRED]: OfferExpiredContext;
}

/**
 * Union type of all possible contexts
 */
export type AnyNotificationContext =
  NotificationContextMap[keyof NotificationContextMap];
