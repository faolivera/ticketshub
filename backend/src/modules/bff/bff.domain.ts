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
