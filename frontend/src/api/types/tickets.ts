import type { Address, Money, PaginationParams } from './common';

/**
 * Ticket type - determines transfer and release behavior
 */
export enum TicketType {
  /**
   * Physical ticket that needs to be delivered
   */
  Physical = 'Physical',

  /**
   * Digital ticket that can be transferred (e.g., PDF, e-ticket)
   */
  DigitalTransferable = 'DigitalTransferable',

  /**
   * Digital ticket that cannot be transferred (e.g., ID-linked, app-only)
   */
  DigitalNonTransferable = 'DigitalNonTransferable',
}

/**
 * Delivery method for physical tickets
 */
export enum DeliveryMethod {
  /**
   * Buyer picks up at specified address
   */
  Pickup = 'Pickup',

  /**
   * Buyer and seller arrange delivery details via messaging
   */
  ArrangeWithSeller = 'ArrangeWithSeller',
}

/**
 * Listing status
 */
export enum ListingStatus {
  Active = 'Active',
  Sold = 'Sold',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

export enum TicketUnitStatus {
  Available = 'available',
  Reserved = 'reserved',
  Sold = 'sold',
}

export interface TicketSeat {
  row: string;
  seatNumber: string;
}

export interface TicketUnit {
  id: string;
  status: TicketUnitStatus;
  seat?: TicketSeat;
}

/**
 * Ticket listing entity
 */
export interface TicketListing {
  id: string;
  sellerId: string;
  eventId: string;
  eventDateId: string;

  type: TicketType;
  ticketUnits: TicketUnit[];
  sellTogether: boolean;

  pricePerTicket: Money;

  // Physical tickets only
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;

  // Ticket details
  description?: string;
  section?: string;

  status: ListingStatus;

  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Listing with event information for display
 */
export interface TicketListingWithEvent extends TicketListing {
  eventName: string;
  eventDate: Date;
  venue: string;
}

// === API Types ===

/**
 * Request to create a new listing
 */
export interface CreateListingRequest {
  eventId: string;
  eventDateId: string;

  type: TicketType;
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
 * Ticket listing enriched with seller public info — returned by the BFF endpoint
 */
export interface ListingWithSeller extends TicketListingWithEvent {
  sellerPublicName: string;
  sellerPic: import('./common').Image;
}

/**
 * Response from the BFF event listings endpoint
 */
export type GetEventListingsResponse = ListingWithSeller[];

/**
 * Query params for listing listings
 */
export interface ListListingsQuery extends PaginationParams {
  eventId?: string;
  eventDateId?: string;
  sellerId?: string;
  type?: TicketType;
  minPrice?: number;
  maxPrice?: number;
}
