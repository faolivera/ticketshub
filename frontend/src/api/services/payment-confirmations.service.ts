import apiClient from '../client';
import type {
  UploadPaymentConfirmationResponse,
  GetPaymentConfirmationResponse,
  ListPaymentConfirmationsResponse,
  PaymentConfirmation,
} from '../types/payment-confirmations';

/**
 * Payment confirmations service
 */
export const paymentConfirmationsService = {
  /**
   * Upload payment confirmation for a transaction
   */
  async uploadConfirmation(
    transactionId: string,
    file: File,
  ): Promise<UploadPaymentConfirmationResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadPaymentConfirmationResponse>(
      `/transactions/${transactionId}/payment-confirmation`,
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
   * Get payment confirmation for a transaction
   */
  async getConfirmation(
    transactionId: string,
  ): Promise<GetPaymentConfirmationResponse> {
    const response = await apiClient.get<GetPaymentConfirmationResponse>(
      `/transactions/${transactionId}/payment-confirmation`,
    );
    return response.data;
  },

  /**
   * Get URL to download/view payment confirmation file
   */
  getFileUrl(transactionId: string): string {
    return `${apiClient.defaults.baseURL}/transactions/${transactionId}/payment-confirmation/file`;
  },

  /**
   * List all pending payment confirmations (admin only)
   */
  async listPendingConfirmations(): Promise<ListPaymentConfirmationsResponse> {
    const response = await apiClient.get<ListPaymentConfirmationsResponse>(
      '/admin/payment-confirmations',
    );
    return response.data;
  },

  /**
   * Update confirmation status (admin only)
   */
  async updateStatus(
    confirmationId: string,
    status: 'Accepted' | 'Rejected',
    adminNotes?: string,
  ): Promise<PaymentConfirmation> {
    const response = await apiClient.patch<PaymentConfirmation>(
      `/admin/payment-confirmations/${confirmationId}`,
      { status, adminNotes },
    );
    return response.data;
  },
};

export default paymentConfirmationsService;
