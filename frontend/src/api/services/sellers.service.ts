import apiClient from '../client';
import type { GetSellerProfileResponse } from '../types';

/**
 * Sellers service (BFF)
 */
export const sellersService = {
  /**
   * Get seller profile by ID
   */
  async getSellerProfile(sellerId: string): Promise<GetSellerProfileResponse> {
    const response = await apiClient.get<GetSellerProfileResponse>(`/sellers/${sellerId}`);
    return response.data;
  },
};

export default sellersService;
