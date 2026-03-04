import apiClient from '../client';
import type {
  InitiatePurchaseRequest,
  InitiatePurchaseResponse,
  ConfirmTransferResponse,
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  GetTransactionChatMessagesResponse,
  TransactionChatMessage,
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

  /**
   * Get transaction chat messages (buyer-seller). Only allowed when status is PaymentReceived or TicketTransferred.
   */
  async getTransactionChatMessages(
    transactionId: string,
    afterId?: string
  ): Promise<GetTransactionChatMessagesResponse> {
    const params = afterId ? { afterId } : undefined;
    const response = await apiClient.get<GetTransactionChatMessagesResponse>(
      `/transactions/${transactionId}/chat/messages`,
      { params }
    );
    return response.data;
  },

  /**
   * Send a message in the transaction chat.
   */
  async postTransactionChatMessage(
    transactionId: string,
    content: string
  ): Promise<TransactionChatMessage> {
    const response = await apiClient.post<TransactionChatMessage>(
      `/transactions/${transactionId}/chat/messages`,
      { content }
    );
    return response.data;
  },
};

export default transactionsService;
