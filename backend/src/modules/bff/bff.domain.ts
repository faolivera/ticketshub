import type { Image } from '../images/images.domain';
import type { TicketListingWithEvent } from '../tickets/tickets.domain';

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
  pic: Image;
  memberSince: string;
  totalSales: number;
  reviewStats: SellerReviewStats;
  reviews: SellerReview[];
}

/**
 * Ticket listing enriched with seller public info — composed by the BFF layer
 */
export interface ListingWithSeller extends TicketListingWithEvent {
  sellerPublicName: string;
  sellerPic: Image;
}

/** Gateway identifier for payment methods */
export type PaymentMethodId = 'payway' | 'mercadopago' | 'uala_bis_debito' | 'bank_transfer';

/** How the payment method is processed */
export type PaymentMethodType = 'webhook_integrated' | 'manual_approval';

/** Payment method option for buy page */
export interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  commissionPercent: number | null;
  type: PaymentMethodType;
}

/** Seller section data for buy page */
export interface BuyPageSellerInfo {
  id: string;
  publicName: string;
  pic: Image;
  badges: string[];
  totalSales: number;
  percentPositiveReviews: number | null;
  totalReviews: number;
}

/** Full buy page data (listing + seller + payment methods) */
export interface BuyPageData {
  listing: TicketListingWithEvent;
  seller: BuyPageSellerInfo;
  paymentMethods: PaymentMethodOption[];
}
