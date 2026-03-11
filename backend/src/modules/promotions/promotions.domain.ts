/**
 * Promotion type - determines which fee is discounted
 */
export enum PromotionType {
  SELLER_DISCOUNTED_FEE = 'SELLER_DISCOUNTED_FEE',
  BUYER_DISCOUNTED_FEE = 'BUYER_DISCOUNTED_FEE',
}

/**
 * Promotion status
 */
export enum PromotionStatus {
  Active = 'active',
  Inactive = 'inactive',
}

/**
 * Config for SELLER_DISCOUNTED_FEE: platform fee percentage applied to seller (must be <= global)
 */
export interface PromotionConfigSellerDiscountedFee {
  feePercentage: number;
}

/**
 * Snapshot of promotion stored on a listing when the listing was created with a promotion.
 * Immutable reference for pricing and display.
 */
export interface PromotionSnapshot {
  id: string;
  name: string;
  type: PromotionType;
  config: PromotionConfigSellerDiscountedFee;
}

/**
 * Promotion entity
 */
export interface Promotion {
  id: string;
  userId: string;
  name: string;
  type: PromotionType;
  config: PromotionConfigSellerDiscountedFee;
  maxUsages: number;
  usedCount: number;
  usedInListingIds: string[];
  status: PromotionStatus;
  validUntil: Date | null;
  createdAt: Date;
  createdBy: string;
  /** Set when the promotion was created by claiming a promotion code */
  promotionCodeId?: string;
}

/**
 * Promotion code entity
 */
type PromotionConfig = Omit<Promotion, 'id' | "name" | "userId" | "createdAt" | "createdBy" | "promotionCodeId">;
export type PromotionConfigTarget = "seller" | "verified_seller" | "buyer" | "verified_buyer";
export interface PromotionCode {
  id: string;
  code: string;
  promotionConfig: PromotionConfig;
  target: PromotionConfigTarget;
  maxUsages: number;
  usedCount: number;
  createdAt: Date;
  createdBy: string;
}