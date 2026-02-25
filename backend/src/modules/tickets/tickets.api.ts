import type { Address } from '../shared/address.domain';
import type {
  TicketType,
  DeliveryMethod,
  Money,
  SeatingType,
  TicketSeat,
  TicketListing,
  TicketListingWithEvent,
} from './tickets.domain';

/**
 * Request to create a new listing
 */
export interface CreateListingRequest {
  eventId: string;
  eventDateId: string;

  type: TicketType;
  seatingType: SeatingType;
  quantity?: number;
  ticketUnits?: CreateListingTicketUnitInput[];
  sellTogether?: boolean;

  pricePerTicket: Money;

  // Physical tickets only
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;

  // Ticket details
  description?: string;
  section?: string;
}

export interface CreateListingTicketUnitInput {
  seat?: TicketSeat;
}

/**
 * Response after creating a listing
 */
export type CreateListingResponse = TicketListing;

/**
 * Request to update a listing
 */
export interface UpdateListingRequest {
  pricePerTicket?: Money;
  description?: string;
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;
  seatingType?: SeatingType;
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
