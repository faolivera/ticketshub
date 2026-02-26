import apiClient from '../client';
import type { GetTransactionDetailsResponse } from '../types';

/**
 * BFF (Backend-for-Frontend) service
 * Handles aggregated endpoints that combine multiple data sources
 */
export const bffService = {
  /**
   * Get transaction details with payment confirmation and reviews
   */
  async getTransactionDetails(
    transactionId: string,
  ): Promise<GetTransactionDetailsResponse> {
    const response = await apiClient.get<GetTransactionDetailsResponse>(
      `/transaction-details/${transactionId}`,
    );
    return response.data;
  },
};

export default bffService;
