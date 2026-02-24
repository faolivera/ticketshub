import type { Image } from './common';

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

export type GetSellerProfileResponse = SellerProfile;
