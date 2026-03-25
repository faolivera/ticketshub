import type { Image } from '../images/images.domain';
import type { TicketListingWithEvent, PublicTicketListingWithEvent } from '../tickets/tickets.domain';
import type { PublicListEventItem } from '../events/events.api';

export type SellerReviewType = 'positive' | 'neutral' | 'negative';

export interface SellerReview {
  id: string;
  buyerName: string;
  type: SellerReviewType;
  comment: string;
  eventName: string;
  ticketType: string;
  eventDate: string;
  reviewDate: string;
}

export interface SellerReviewStats {
  positive: number;
  neutral: number;
  negative: number;
}

export interface SellerProfile {
  id: string;
  publicName: string;
  /** Seller profile image; null when none set */
  pic: Image | null;
  memberSince: string;
  totalSales: number;
  reviewStats: SellerReviewStats;
  reviews: SellerReview[];
}

/** Lightweight seller reputation summary for listing cards */
export interface SellerReputation {
  totalSales: number;
  totalReviews: number;
  positivePercent: number | null;
  badges: string[];
}

/**
 * Ticket listing enriched with seller public info — composed by the BFF layer
 */
export interface ListingWithSeller extends PublicTicketListingWithEvent {
  sellerPublicName: string;
  /** Seller profile image; null when none set */
  sellerPic: Image | null;
  /** Max total commission percent the buyer will pay (platform fee + highest payment method fee) */
  maxTotalCommissionPercent: number;
  sellerReputation: SellerReputation;
}

/** Combined event page data: event (public shape) + enriched listings */
export interface EventPageData {
  event: PublicListEventItem;
  listings: ListingWithSeller[];
}

/** Seller section data for buy page */
export interface BuyPageSellerInfo {
  id: string;
  publicName: string;
  /** Seller profile image; null when none set */
  pic: Image | null;
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
  /** Combined service fee percentage (platform + payment method); used for one "Precio por servicio" line */
  serviceFeePercent: number;
  /** Whether this method is currently available for selection (maps to status === 'enabled' on the payment method) */
  available: boolean;
}

/** Checkout risk: which verifications are required and which are missing for the current user. */
export interface CheckoutRisk {
  requireV1: boolean;
  requireV2: boolean;
  requireV3: boolean;
  /** True when V1 is required but the buyer has not verified email. */
  missingV1: boolean;
  /** True when V2 is required but the buyer has not verified phone. */
  missingV2: boolean;
  /** True when V3 is required but the buyer has not verified identity (ID document). */
  missingV3: boolean;
}

/** Full buy page data (listing + seller + payment methods + pricing snapshot) */
export interface BuyPageData {
  listing: PublicTicketListingWithEvent;
  seller: BuyPageSellerInfo;
  paymentMethods: BuyPagePaymentMethodOption[];
  pricingSnapshot: BuyPagePricingSnapshot;
  /** Present when request is authenticated; tells frontend which verifications to request before checkout */
  checkoutRisk?: CheckoutRisk;
}
