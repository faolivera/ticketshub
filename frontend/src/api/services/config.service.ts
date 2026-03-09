import apiClient from '../client';
import type {
  GetAppEnvironmentResponse,
  GetSellerPricingResponse,
} from '../types/config';

/**
 * Config service for non-admin config values (e.g. seller pricing, app environment).
 */
export const configService = {
  /**
   * Get app environment (dev, test, staging, prod). Public, no auth.
   * Used e.g. to load analytics only in prod.
   */
  async getAppEnvironment(): Promise<GetAppEnvironmentResponse> {
    const response = await apiClient.get<GetAppEnvironmentResponse>(
      '/config/app-environment',
    );
    return response.data;
  },

  /**
   * Get seller pricing config (platform fee %) for the sell-ticket summary.
   * Requires authentication.
   */
  async getSellerPricing(): Promise<GetSellerPricingResponse> {
    const response = await apiClient.get<GetSellerPricingResponse>(
      '/config/seller-pricing',
    );
    return response.data;
  },
};
