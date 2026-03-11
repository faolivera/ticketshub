import type {
  Promotion,
  PromotionStatus,
  PromotionType,
} from './promotions.domain';

/**
 * Request body to create one or more promotions (one per user)
 */
export interface CreatePromotionRequest {
  name: string;
  type: PromotionType;
  config: { feePercentage: number };
  maxUsages: number;
  validUntil?: string | null; // ISO date string
  /** User IDs to create a promotion for (one row per user) */
  userIds?: string[];
  /** Emails to resolve to users and create a promotion for (one row per user) */
  emails?: string[];
}

/**
 * Single promotion in list response (with optional user info for admin)
 */
export interface PromotionListItem {
  id: string;
  userId: string;
  userEmail?: string;
  name: string;
  type: PromotionType;
  config: { feePercentage: number };
  maxUsages: number;
  usedCount: number;
  usedInListingIds: string[];
  status: PromotionStatus;
  validUntil: string | null;
  promotionCodeId?: string;
  createdAt: string;
  createdBy: string;
}

export type ListPromotionsResponse = PromotionListItem[];

export type CreatePromotionResponse = Promotion[];

/**
 * Request to update promotion status
 */
export interface UpdatePromotionStatusRequest {
  status: PromotionStatus;
}

/**
 * Active promotion summary for sell-ticket BFF (no sensitive data)
 */
export interface ActivePromotionSummary {
  id: string;
  name: string;
  type: PromotionType;
  config: { feePercentage: number };
}

/**
 * Sell-ticket config response (BFF)
 */
export interface SellTicketConfigResponse {
  sellerPlatformFeePercentage: number;
  activePromotion?: ActivePromotionSummary;
}

// --- Promotion codes (claim + admin) ---

export interface ClaimPromotionCodeRequest {
  code: string;
  role: 'buyer' | 'seller';
}

export type ClaimPromotionCodeResponse = Promotion;

export type PromotionConfigTarget =
  | 'seller'
  | 'verified_seller'
  | 'buyer'
  | 'verified_buyer';

export interface CreatePromotionCodeRequest {
  code: string;
  target: PromotionConfigTarget;
  promotionConfig: {
    type: PromotionType;
    config: { feePercentage: number };
    maxUsages: number;
    validUntil?: string | null;
  };
  maxUsages: number;
}

export interface PromotionCodeListItem {
  id: string;
  code: string;
  target: PromotionConfigTarget;
  promotionConfig: { type: PromotionType; config: { feePercentage: number }; maxUsages: number; validUntil: string | null };
  maxUsages: number;
  usedCount: number;
  createdAt: string;
  createdBy: string;
}

export type ListPromotionCodesResponse = PromotionCodeListItem[];
