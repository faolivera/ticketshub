import apiClient from '../client';
import type {
  UploadPaymentConfirmationResponse,
  ListPaymentConfirmationsResponse,
  PaymentConfirmation,
} from '../types/payment-confirmations';

/**
 * Payment confirmations service
 *
 * Note: For fetching payment confirmation metadata along with transaction details,
 * use bffService.getTransactionDetails() instead.
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
   * Fetch the payment confirmation file as a blob URL.
   * This method handles authentication properly.
   */
  async getFileBlobUrl(transactionId: string): Promise<string> {
    const response = await apiClient.get<Blob>(
      `/transactions/${transactionId}/payment-confirmation/file`,
      { responseType: 'blob' },
    );
    return URL.createObjectURL(response.data);
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
