import type { Address } from '../shared/address.domain';
import type { CurrencyCode } from '../shared/money.domain';

/**
 * Money representation
 */
export interface Money {
  amount: number; // in cents
  currency: CurrencyCode;
}

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
   * Payment released automatically after event + X minutes
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
  Pending = 'Pending',
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

export enum SeatingType {
  Numbered = 'numbered',
  Unnumbered = 'unnumbered',
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
  seatingType: SeatingType;
  ticketUnits: TicketUnit[];
  sellTogether: boolean; // true = all or nothing

  pricePerTicket: Money;

  // Physical tickets only
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;

  // Ticket details
  description?: string;
  section?: string;

  status: ListingStatus;

  expiresAt?: Date; // Optional expiration
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
