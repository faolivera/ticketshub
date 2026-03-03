import apiClient from '../client';
import type {
  GetTransactionDetailsResponse,
  GetSellTicketConfigResponse,
} from '../types';

/**
 * BFF (Backend-for-Frontend) service
 * Handles aggregated endpoints that combine multiple data sources
 */
export const bffService = {
  /**
   * Get sell-ticket page config: platform fee % and active promotion (if any).
   * Requires authentication.
   */
  async getSellTicketConfig(): Promise<GetSellTicketConfigResponse> {
    const response = await apiClient.get<GetSellTicketConfigResponse>(
      '/sell-ticket/config',
    );
    return response.data;
  },

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
