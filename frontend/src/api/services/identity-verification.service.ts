import { apiClient, getToken } from '../client';
import type {
  GetMyVerificationResponse,
  SubmitVerificationResponse,
  ListIdentityVerificationsResponse,
  IdentityVerificationRequest,
  IdentityVerificationStatus,
} from '../types/identity-verification';

export const identityVerificationService = {
  /**
   * Submit identity verification request with documents
   */
  async submitVerification(data: {
    legalFirstName: string;
    legalLastName: string;
    dateOfBirth: string;
    governmentIdNumber: string;
    documentFront: File;
    documentBack: File;
  }): Promise<SubmitVerificationResponse> {
    const formData = new FormData();
    formData.append('legalFirstName', data.legalFirstName);
    formData.append('legalLastName', data.legalLastName);
    formData.append('dateOfBirth', data.dateOfBirth);
    formData.append('governmentIdNumber', data.governmentIdNumber);
    formData.append('documentFront', data.documentFront);
    formData.append('documentBack', data.documentBack);

    const response = await apiClient.post<SubmitVerificationResponse>(
      '/users/identity-verification',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  /**
   * Get current user's verification status
   */
  async getMyVerification(): Promise<GetMyVerificationResponse> {
    const response = await apiClient.get<GetMyVerificationResponse>(
      '/users/identity-verification',
    );
    return response.data;
  },

  /**
   * List all verifications (admin only)
   */
  async listVerifications(
    status?: IdentityVerificationStatus,
  ): Promise<ListIdentityVerificationsResponse> {
    const params = status ? { status } : {};
    const response = await apiClient.get<ListIdentityVerificationsResponse>(
      '/admin/identity-verifications',
      { params },
    );
    return response.data;
  },

  /**
   * Get document blob URL for preview (admin only)
   */
  async getDocumentBlobUrl(
    verificationId: string,
    documentType: 'front' | 'back',
  ): Promise<string> {
    const token = getToken();
    const response = await fetch(
      `/api/admin/identity-verifications/${verificationId}/document/${documentType}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error('Failed to fetch document');
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * Update verification status (admin only)
   */
  async updateStatus(
    verificationId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string,
  ): Promise<IdentityVerificationRequest> {
    const response = await apiClient.patch<IdentityVerificationRequest>(
      `/admin/identity-verifications/${verificationId}`,
      { status, adminNotes },
    );
    return response.data;
  },
};
