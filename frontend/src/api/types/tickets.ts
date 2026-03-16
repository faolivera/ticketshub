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

/** Best-offer configuration for a listing (seller can enable and set minimum price). */
export interface BestOfferConfig {
  enabled: boolean;
  minimumPrice: Money;
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
  sellTogether: boolean;

  pricePerTicket: Money;

  bestOfferConfig?: BestOfferConfig;

  // Physical tickets only
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;

  // Ticket details
  eventSectionId: string;

  status: ListingStatus;

  expiresAt?: Date;
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
 */
export interface TicketListingWithEvent extends TicketListing {
  eventName: string;
  eventSlug: string;
  eventDate: Date;
  venue: string;
  sectionName?: string;
  pendingReason?: string[];
  bannerUrls?: BannerUrls;
}

// === API Types ===

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

  bestOfferConfig?: BestOfferConfig;

  // Physical tickets only
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;

  // Ticket details
  eventSectionId: string;
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
  deliveryMethod?: DeliveryMethod;
  pickupAddress?: Address;
  bestOfferConfig?: BestOfferConfig | null;
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

/** Lightweight seller reputation summary returned with each listing */
export interface SellerReputation {
  totalSales: number;
  totalReviews: number;
  positivePercent: number | null;
  badges: string[];
}

/**
 * Ticket listing enriched with seller public info — returned by the BFF endpoint
 */
export interface ListingWithSeller extends TicketListingWithEvent {
  sellerPublicName: string;
  /** Seller profile image; null when none set */
  sellerPic: import('./common').Image | null;
  /** Commission percent range (min–max) depending on payment method */
  commissionPercentRange: { min: number; max: number };
  sellerReputation: SellerReputation;
}

/** Combined event page data from BFF (event is public shape) */
export interface EventPageData {
  event: import('./events').PublicListEventItem;
  listings: ListingWithSeller[];
}

/** Response from GET /api/event-page/:eventSlug */
export type GetEventPageResponse = EventPageData;

/** How the payment method is processed */
export type PaymentMethodType = 'payment_gateway' | 'manual_approval';

/** Payment method status */
export type PaymentMethodStatus = 'enabled' | 'disabled';

/** Available payment gateway providers */
export type PaymentGatewayProvider =
  | 'mercadopago'
  | 'uala_bis'
  | 'payway'
  | 'astropay';

/** Configuration for bank transfer payment methods */
export interface BankTransferConfig {
  cbu: string;
  accountHolderName: string;
  bankName: string;
  cuitCuil: string;
}

/** Payment method option - admin managed (full) */
export interface PaymentMethodOption {
  id: string;
  name: string;
  publicName: string;
  type: PaymentMethodType;
  status: PaymentMethodStatus;
  buyerCommissionPercent: number | null;
  gatewayProvider?: PaymentGatewayProvider;
  gatewayConfigEnvPrefix?: string;
  bankTransferConfig?: BankTransferConfig;
  createdAt: Date;
  updatedAt: Date;
}

/** Public payment method option - exposed to buyers (safe fields only) */
export interface PublicPaymentMethodOption {
  id: string;
  name: string;
  type: PaymentMethodType;
  buyerCommissionPercent: number | null;
  bankTransferConfig?: BankTransferConfig;
}

/** Seller section data for buy page (BFF) */
export interface BuyPageSellerInfo {
  id: string;
  publicName: string;
  /** Seller profile image; null when none set */
  pic: import('./common').Image | null;
  badges: string[];
  totalSales: number;
  percentPositiveReviews: number | null;
  totalReviews: number;
  memberSince: string;
}

/** Pricing snapshot summary for buy page (minimal data for UI; no fee breakdown) */
export interface BuyPagePricingSnapshot {
  id: string;
  expiresAt: Date;
}

/** Payment method option for buy page: single service fee % (platform + payment method) */
export interface BuyPagePaymentMethodOption {
  id: string;
  name: string;
  serviceFeePercent: number;
}

/** Checkout risk: which verifications are required and which are missing for the current user (from BFF). */
export interface CheckoutRisk {
  requireV1: boolean;
  requireV2: boolean;
  requireV3: boolean;
  /** True when V1 is required but the buyer has not verified email. Omitted in older API; frontend falls back to requireV1 && !user.emailVerified. */
  missingV1?: boolean;
  /** True when V2 is required but the buyer has not verified phone. */
  missingV2?: boolean;
  /** True when V3 is required but the buyer has not verified identity (ID document). */
  missingV3?: boolean;
}

/** Full buy page data (listing + seller + payment methods + pricing snapshot) from BFF */
export interface BuyPageData {
  listing: TicketListingWithEvent;
  seller: BuyPageSellerInfo;
  paymentMethods: BuyPagePaymentMethodOption[];
  pricingSnapshot: BuyPagePricingSnapshot;
  /** Present when authenticated; tells frontend which verifications to request before checkout */
  checkoutRisk?: CheckoutRisk;
}

/** Response from GET /api/buy/:listingId */
export type GetBuyPageResponse = BuyPageData;

/** Response from GET /api/buy/:listingId/checkout-risk (re-evaluate risk for quantity + payment method) */
export interface GetCheckoutRiskResponse {
  checkoutRisk: CheckoutRisk;
}

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
