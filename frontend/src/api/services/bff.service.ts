import apiClient from '../client';
import type {
  GetTransactionDetailsResponse,
  GetSellTicketConfigResponse,
  ValidateSellListingRequest,
  ValidateSellListingResponse,
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
   * Validate whether the seller can create a listing from a risk perspective (Tier 0 limits).
   * Same checks as createListing; used by the sell wizard before advancing from the price step.
   */
  async validateSellListing(
    body: ValidateSellListingRequest,
  ): Promise<ValidateSellListingResponse> {
    const response = await apiClient.post<ValidateSellListingResponse>(
      '/sell/validate',
      body,
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
