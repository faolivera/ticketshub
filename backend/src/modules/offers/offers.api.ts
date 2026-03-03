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

/** Response for listing current user's offers (buyer view). */
export type ListMyOffersResponse = Offer[];

/** Response for accept/reject. */
export type AcceptOfferResponse = Offer;
export type RejectOfferResponse = Offer;
