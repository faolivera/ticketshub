import apiClient from '../client';
import type {
  CreateListingRequest,
  CreateListingResponse,
  UpdateListingRequest,
  UpdateListingResponse,
  GetListingResponse,
  ListListingsResponse,
  ListListingsQuery,
  GetEventListingsResponse,
  GetMyTicketsResponse,
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
   * Get event listings enriched with seller info (BFF endpoint)
   */
  async getEventListings(eventId: string): Promise<GetEventListingsResponse> {
    const response = await apiClient.get<GetEventListingsResponse>('/listings', { params: { eventId } });
    return response.data;
  },

  /**
   * Get current user's tickets: bought, sold, and listed (BFF endpoint)
   */
  async getMyTickets(): Promise<GetMyTicketsResponse> {
    const response = await apiClient.get<GetMyTicketsResponse>('/my-tickets');
    return response.data;
  },
};

export default ticketsService;
