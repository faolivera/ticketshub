import type { Address } from '../shared/address.domain';
import type {
  TicketType,
  DeliveryMethod,
  Money,
  TicketSeat,
  TicketListing,
  TicketListingWithEvent,
  BestOfferConfig,
} from './tickets.domain';

/**
 * Request to create a new listing
 * seatingType is derived from the event section
 */
export interface CreateListingRequest {
  eventId: string;
  eventDateId: string;

  type: TicketType;
  quantity?: number;
  ticketUnits?: CreateListingTicketUnitInput[];
  sellTogether?: boolean;

  pricePerTicket: Money;

  /** Optional: allow buyers to make offers with a minimum price. */
  bestOfferConfig?: BestOfferConfig;

  // Physical tickets only
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;

  // Ticket details
  eventSectionId: string;

  /** Optional promotion code to claim and apply to this listing (seller flow). */
  promotionCode?: string;
}

export interface CreateListingTicketUnitInput {
  seat?: TicketSeat;
}

/**
 * Response after creating a listing (enriched with section-derived seatingType)
 */
export type CreateListingResponse = TicketListingWithEvent;

/**
 * Request to update a listing
 */
export interface UpdateListingRequest {
  pricePerTicket?: Money;
  /** Optional: allow buyers to make offers; set to undefined to clear. */
  bestOfferConfig?: BestOfferConfig | null;
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;
}

/**
 * Response after updating a listing
 */
export type UpdateListingResponse = TicketListing;

/**
 * Response for getting listing details
 */
export type GetListingResponse = TicketListingWithEvent;

/**
 * Response for listing listings
 */
export type ListListingsResponse = TicketListingWithEvent[];

/**
 * Query params for listing listings
 */
export interface ListListingsQuery {
  eventId?: string;
  eventDateId?: string;
  sellerId?: string;
  type?: TicketType;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}
