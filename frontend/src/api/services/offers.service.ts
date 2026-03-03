import apiClient from '../client';
import type {
  CreateOfferRequest,
  ListOffersByListingResponse,
  ListMyOffersResponse,
  AcceptOfferResponse,
  RejectOfferResponse,
  Offer,
} from '../types';

/**
 * Offers API service (authenticated).
 */
export const offersService = {
  async create(data: CreateOfferRequest): Promise<Offer> {
    const response = await apiClient.post<Offer>('/offers', data);
    return response.data;
  },

  async listMyOffers(): Promise<ListMyOffersResponse> {
    const response = await apiClient.get<ListMyOffersResponse>('/offers/me');
    return response.data;
  },

  async listByListing(listingId: string): Promise<ListOffersByListingResponse> {
    const response = await apiClient.get<ListOffersByListingResponse>(
      `/offers/listing/${listingId}`,
    );
    return response.data;
  },

  async accept(offerId: string): Promise<AcceptOfferResponse> {
    const response = await apiClient.post<AcceptOfferResponse>(
      `/offers/${offerId}/accept`,
    );
    return response.data;
  },

  async reject(offerId: string): Promise<RejectOfferResponse> {
    const response = await apiClient.post<RejectOfferResponse>(
      `/offers/${offerId}/reject`,
    );
    return response.data;
  },
};
