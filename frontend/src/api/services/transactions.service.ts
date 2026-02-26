import apiClient from '../client';
import type {
  InitiatePurchaseRequest,
  InitiatePurchaseResponse,
  ConfirmTransferResponse,
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
} from '../types';

/**
 * Transactions service
 *
 * Note: For fetching transaction details with payment confirmation and reviews,
 * use bffService.getTransactionDetails() instead.
 */
export const transactionsService = {
  /**
   * Initiate a purchase
   */
  async initiatePurchase(data: InitiatePurchaseRequest): Promise<InitiatePurchaseResponse> {
    const response = await apiClient.post<InitiatePurchaseResponse>('/transactions', data);
    return response.data;
  },

  /**
   * Confirm ticket transfer (seller action)
   */
  async confirmTransfer(id: string, transferProof?: string): Promise<ConfirmTransferResponse> {
    const response = await apiClient.post<ConfirmTransferResponse>(
      `/transactions/${id}/transfer`,
      { transferProof }
    );
    return response.data;
  },

  /**
   * Confirm receipt (buyer action)
   */
  async confirmReceipt(id: string, data: ConfirmReceiptRequest): Promise<ConfirmReceiptResponse> {
    const response = await apiClient.post<ConfirmReceiptResponse>(
      `/transactions/${id}/confirm`,
      data
    );
    return response.data;
  },

  /**
   * Cancel a transaction
   */
  async cancelTransaction(id: string): Promise<{ cancelled: boolean }> {
    const response = await apiClient.post<{ cancelled: boolean }>(`/transactions/${id}/cancel`);
    return response.data;
  },
};

export default transactionsService;
