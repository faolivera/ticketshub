import apiClient from '../client';
import type { GetSellerPricingResponse } from '../types/config';

/**
 * Config service for non-admin config values (e.g. seller pricing).
 */
export const configService = {
  /**
   * Get seller pricing config (platform fee %) for the sell-ticket summary.
   * Requires authentication.
   */
  async getSellerPricing(): Promise<GetSellerPricingResponse> {
    const response = await apiClient.get<GetSellerPricingResponse>('/config/seller-pricing');
    return response.data;
  },
};
