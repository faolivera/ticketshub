import type { Money } from '../tickets/tickets.domain';

/**
 * Offer status lifecycle: pending -> accepted | rejected | cancelled | expired
 * accepted -> converted | cancelled | expired
 */
export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'converted'
  | 'cancelled';

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
  createdAt: Date;
  updatedAt: Date;
}
