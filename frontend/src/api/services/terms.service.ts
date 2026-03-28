import { apiClient } from '../client';
import type {
  GetCurrentTermsResponse,
  AcceptTermsRequest,
  AcceptTermsResponse,
  GetTermsStatusResponse,
  UpdateTermsContentResponse,
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

  async updateTermsContent(
    userType: TermsUserType,
    content: string,
  ): Promise<UpdateTermsContentResponse> {
    const response = await apiClient.patch<UpdateTermsContentResponse>(
      `/terms/admin/${userType}/content`,
      { content },
    );
    return response.data;
  },
};
