/**
 * Response of GET /api/promotions/seller/check?code=XXX
 * Returned when code is valid for seller (target seller|verified_seller, BUYER_DISCOUNTED_FEE, not expired, has usages).
 */
export type PromotionConfigTarget =
  | 'seller'
  | 'verified_seller'
  | 'buyer'
  | 'verified_buyer';

export type PromotionType = 'SELLER_DISCOUNTED_FEE' | 'BUYER_DISCOUNTED_FEE';

export interface CheckSellerPromotionCodeResponse {
  code: string;
  name: string;
  target: PromotionConfigTarget;
  type: PromotionType;
  config: { feePercentage: number };
}
