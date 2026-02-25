import { apiClient } from '../client';
import type {
  GetCurrentTermsResponse,
  AcceptTermsRequest,
  AcceptTermsResponse,
  GetTermsStatusResponse,
  TermsUserType,
} from '../types/terms';

export const termsService = {
  async getCurrentTerms(userType: TermsUserType): Promise<GetCurrentTermsResponse> {
    const response = await apiClient.get<GetCurrentTermsResponse>(
      `/terms/current/${userType}`,
    );
    return response.data;
  },

  async acceptTerms(
    versionId: string,
    method: AcceptTermsRequest['method'],
  ): Promise<AcceptTermsResponse> {
    const response = await apiClient.post<AcceptTermsResponse>(
      `/terms/${versionId}/accept`,
      { method },
    );
    return response.data;
  },

  async getTermsStatus(): Promise<GetTermsStatusResponse> {
    const response = await apiClient.get<GetTermsStatusResponse>(
      '/terms/status',
    );
    return response.data;
  },

  getTermsContentUrl(versionId: string): string {
    return `/api/terms/${versionId}/content`;
  },
};
