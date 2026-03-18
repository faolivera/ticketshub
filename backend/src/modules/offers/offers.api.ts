import type { Money } from '../tickets/tickets.domain';
import type { Offer, OfferTickets } from './offers.domain';

/** Request to create an offer. */
export interface CreateOfferRequest {
  listingId: string;
  offeredPrice: Money;
  tickets: OfferTickets;
}

/** Response after creating an offer. */
export type CreateOfferResponse = Offer;

/** Response for listing offers for a listing (seller view). */
export type ListOffersByListingResponse = Offer[];

/** Listing summary attached to each offer in "my offers" (buyer view). */
export interface OfferListingSummary {
  eventName: string;
  eventSlug: string;
  eventDate: string; // ISO date string
  sellerName: string;
  bannerUrls?: { square?: string; rectangle?: string };
}

/** Enriched offer returned by GET /offers/me (buyer view). */
export interface OfferWithListingSummary extends Offer {
  listingSummary: OfferListingSummary;
}

/** Response for listing current user's offers (buyer view). */
export type ListMyOffersResponse = OfferWithListingSummary[];

/** Context for an offer received by the seller (offers on my listings). */
export interface OfferReceivedContext {
  listingId: string;
  eventName: string;
  eventSlug: string;
  eventDate: string;
  /** Event section / listing sector label */
  sectionName: string;
  listingPrice: Money;
  bannerUrls?: { square?: string; rectangle?: string };
  buyerName: string;
}

/** Enriched offer returned by GET /offers/received (seller view). */
export interface OfferWithReceivedContext extends Offer {
  receivedContext: OfferReceivedContext;
}

/** Response for listing offers received by the current user (seller view). */
export type ListReceivedOffersResponse = OfferWithReceivedContext[];

/** Response for accept/reject. */
export type AcceptOfferResponse = Offer;
export type RejectOfferResponse = Offer;
