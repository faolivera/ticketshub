import apiClient from '../client';
import type {
  InitiatePurchaseRequest,
  InitiatePurchaseResponse,
  GetTransactionResponse,
  ConfirmTransferResponse,
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
} from '../types';

/**
 * Transactions service
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
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<GetTransactionResponse> {
    const response = await apiClient.get<GetTransactionResponse>(`/transactions/${id}`);
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
