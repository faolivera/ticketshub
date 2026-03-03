import type { Money } from './common';

export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'converted'
  | 'cancelled';

export interface OfferSeat {
  row: string;
  seatNumber: string;
}

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
  expiresAt: string;
  acceptedAt?: string;
  acceptedExpiresAt?: string;
  rejectedAt?: string;
  convertedTransactionId?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferRequest {
  listingId: string;
  offeredPrice: Money;
  tickets?: OfferTickets;
}

/** Backend returns the created offer directly. */
export type CreateOfferResponse = Offer;

/** Backend returns the array directly (unwrapped from ApiResponse). */
export type ListOffersByListingResponse = Offer[];

/** Backend returns the array directly (unwrapped from ApiResponse). */
export type ListMyOffersResponse = Offer[];

export type AcceptOfferResponse = Offer;
export type RejectOfferResponse = Offer;
