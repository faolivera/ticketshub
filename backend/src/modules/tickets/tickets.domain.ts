import type { Address } from '../shared/address.domain';
import type { CurrencyCode } from '../shared/money.domain';
import type { PromotionSnapshot } from '../promotions/promotions.domain';

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
   * Digital ticket (e.g., PDF, e-ticket)
   */
  Digital = 'Digital',
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
  listingId: string;
  status: TicketUnitStatus;
  seat?: TicketSeat;
  version: number;
}

/**
 * Optional config for accepting offers on a listing (seller can enable/disable).
 */
export interface BestOfferConfig {
  enabled: boolean;
  minimumPrice: Money;
}

/**
 * Ticket listing entity
 * seatingType is derived from the event section, not stored on the listing
 */
export interface TicketListing {
  id: string;
  sellerId: string;
  eventId: string;
  eventDateId: string;

  type: TicketType;
  ticketUnits: TicketUnit[];
  sellTogether: boolean; // true = all or nothing

  pricePerTicket: Money;

  /** When set, buyers can make offers; minimumPrice is the floor per ticket. */
  bestOfferConfig?: BestOfferConfig;

  // Physical tickets only
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;

  // Ticket details
  eventSectionId: string;

  /** Snapshot of promotion applied when listing was created (id, name, type, config) */
  promotionSnapshot?: PromotionSnapshot;

  status: ListingStatus;
  version: number;

  expiresAt?: Date; // Optional expiration
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Banner URLs for display
 */
export interface BannerUrls {
  square?: string;
  rectangle?: string;
}

/**
 * Listing with event information for display
 * seatingType is derived from the event section
 */
export interface TicketListingWithEvent extends TicketListing {
  seatingType: SeatingType;
  eventName: string;
  eventDate: Date;
  venue: string;
  sectionName: string;
  pendingReason?: string[];
  bannerUrls?: BannerUrls;
}
