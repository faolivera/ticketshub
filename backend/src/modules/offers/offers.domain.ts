import type { Money } from '../tickets/tickets.domain';

/**
 * Offer status lifecycle:
 *   pending -> accepted | rejected | cancelled | expired(seller_no_response)
 *   accepted -> converted | cancelled | expired(buyer_no_purchase)
 */
export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'converted'
  | 'cancelled'
  | 'expired';

/**
 * Why an offer expired:
 * - seller_no_response: offer was pending when expiresAt passed
 * - buyer_no_purchase:  offer was accepted when acceptedExpiresAt passed
 */
export type OfferExpiredReason = 'seller_no_response' | 'buyer_no_purchase';

/** Seat identifier for numbered tickets (aligns with TicketUnit / TicketSeat). */
export interface OfferSeat {
  row: string;
  seatNumber: string;
}

/** Tickets requested in an offer: numbered (specific seats) or unnumbered (count). */
export type OfferTickets =
  | { type: 'numbered'; seats: OfferSeat[] }
  | { type: 'unnumbered'; count: number };

export interface Offer {
  id: string;
  listingId: string;
  userId: string;
  offeredPrice: Money;
  status: OfferStatus;
  tickets: OfferTickets;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedExpiresAt?: Date;
  rejectedAt?: Date;
  convertedTransactionId?: string;
  cancelledAt?: Date;
  expiredAt?: Date;
  expiredReason?: OfferExpiredReason;
  createdAt: Date;
  updatedAt: Date;
}
