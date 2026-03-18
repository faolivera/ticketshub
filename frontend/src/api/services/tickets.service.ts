import apiClient from '../client';
import type {
  CreateListingRequest,
  CreateListingResponse,
  UpdateListingRequest,
  UpdateListingResponse,
  GetListingResponse,
  ListListingsResponse,
  ListListingsQuery,
  GetEventPageResponse,
  GetMyTicketsResponse,
  GetBuyPageResponse,
  GetCheckoutRiskResponse,
  GetActivityHistoryResponse,
} from '../types';

/**
 * Tickets/Listings service
 */
export const ticketsService = {
  /**
   * List listings with optional filters
   */
  async listListings(query?: ListListingsQuery): Promise<ListListingsResponse> {
    const response = await apiClient.get<ListListingsResponse>('/tickets', { params: query });
    return response.data;
  },

  /**
   * Get listing by ID
   */
  async getListing(id: string): Promise<GetListingResponse> {
    const response = await apiClient.get<GetListingResponse>(`/tickets/${id}`);
    return response.data;
  },

  /**
   * Create a new listing
   */
  async createListing(data: CreateListingRequest): Promise<CreateListingResponse> {
    const response = await apiClient.post<CreateListingResponse>('/tickets', data);
    return response.data;
  },

  /**
   * Update a listing
   */
  async updateListing(id: string, data: UpdateListingRequest): Promise<UpdateListingResponse> {
    const response = await apiClient.patch<UpdateListingResponse>(`/tickets/${id}`, data);
    return response.data;
  },

  /**
   * Cancel a listing
   */
  async cancelListing(id: string): Promise<{ cancelled: boolean }> {
    const response = await apiClient.delete<{ cancelled: boolean }>(`/tickets/${id}`);
    return response.data;
  },

  /**
   * Get event page data by slug: event + enriched listings (single BFF call)
   */
  async getEventPage(eventSlug: string): Promise<GetEventPageResponse> {
    const response = await apiClient.get<GetEventPageResponse>(`/event-page/${eventSlug}`);
    return response.data;
  },

  /**
   * Get current user's tickets: bought, sold, and listed (BFF endpoint)
   */
  async getMyTickets(): Promise<GetMyTicketsResponse> {
    const response = await apiClient.get<GetMyTicketsResponse>('/my-tickets');
    return response.data;
  },

  /**
   * Paginated terminal transactions + closed offers (buyer or seller).
   */
  async getActivityHistory(
    role: 'buyer' | 'seller',
    cursor: string | null | undefined,
    limit = 15,
  ): Promise<GetActivityHistoryResponse> {
    const params: Record<string, string | number> = { role, limit };
    if (cursor) params.cursor = cursor;
    const response = await apiClient.get<GetActivityHistoryResponse>('/activity-history', { params });
    return response.data;
  },

  /**
   * Get buy page data: listing, seller info, and payment methods (BFF endpoint).
   * API uses listingId; URL is /buy/:eventSlug/:listingId for SEO.
   */
  async getBuyPage(listingId: string): Promise<GetBuyPageResponse> {
    const response = await apiClient.get<GetBuyPageResponse>(`/buy/${listingId}`);
    return response.data;
  },

  /**
   * Re-evaluate checkout risk for quantity and payment method (BFF endpoint, authenticated).
   * Use when user changes quantity or payment method on the buy page.
   */
  async getCheckoutRisk(
    listingId: string,
    quantity: number,
    paymentMethodId: string
  ): Promise<GetCheckoutRiskResponse> {
    const response = await apiClient.get<GetCheckoutRiskResponse>(`/buy/${listingId}/checkout-risk`, {
      params: { quantity: Math.max(1, Math.floor(quantity)), paymentMethodId },
    });
    return response.data;
  },
};

export default ticketsService;
