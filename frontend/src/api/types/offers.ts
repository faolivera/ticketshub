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

/** Listing summary attached to each offer in GET /offers/me */
export interface OfferListingSummary {
  eventName: string;
  eventSlug: string;
  eventDate: string;
  sellerName: string;
  bannerUrls?: { square?: string; rectangle?: string };
}

/** Enriched offer returned by GET /offers/me */
export interface OfferWithListingSummary extends Offer {
  listingSummary: OfferListingSummary;
}

/** Backend returns the array directly (unwrapped from ApiResponse). */
export type ListMyOffersResponse = OfferWithListingSummary[];

/** Context for an offer received by the seller (GET /offers/received). */
export interface OfferReceivedContext {
  listingId: string;
  eventName: string;
  eventSlug: string;
  eventDate: string;
  listingPrice: { amount: number; currency: string };
  bannerUrls?: { square?: string; rectangle?: string };
  buyerName: string;
}

/** Enriched offer returned by GET /offers/received (seller view). */
export interface OfferWithReceivedContext extends Offer {
  receivedContext: OfferReceivedContext;
}

export type ListReceivedOffersResponse = OfferWithReceivedContext[];

export type AcceptOfferResponse = Offer;
export type RejectOfferResponse = Offer;
