import apiClient from '../client';
import type { CheckSellerPromotionCodeResponse } from '../types/promotions';

/**
 * Promotions API (seller check for sell-ticket flow)
 */
export const promotionsService = {
  /**
   * Check if a promotion code can be used by the seller (preview only; does not claim).
   * Returns the promotion config when valid (target seller|verified_seller, type BUYER_DISCOUNTED_FEE, not expired, has usages).
   */
  async checkSellerPromotionCode(
    code: string,
  ): Promise<CheckSellerPromotionCodeResponse | null> {
    const trimmed = code?.trim();
    if (!trimmed) return null;
    const response = await apiClient.get<CheckSellerPromotionCodeResponse | null>(
      '/promotions/seller/check',
      { params: { code: trimmed } },
    );
    return response.data;
  },
};

export default promotionsService;
