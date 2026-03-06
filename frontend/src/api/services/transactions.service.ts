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
   * Confirm ticket transfer (seller action). Optionally pass how the ticket was sent (payloadType).
   */
  async confirmTransfer(
    id: string,
    options?: { transferProof?: string; payloadType?: 'qr' | 'pdf' | 'text' }
  ): Promise<ConfirmTransferResponse> {
    const response = await apiClient.post<ConfirmTransferResponse>(
      `/transactions/${id}/transfer`,
      options ?? {}
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
   * @param markRead - when false, messages are not marked as read (e.g. when chat was auto-opened; mark on interaction instead)
   */
  async getTransactionChatMessages(
    transactionId: string,
    afterId?: string,
    markRead: boolean = true
  ): Promise<GetTransactionChatMessagesResponse> {
    const params: Record<string, string> = {};
    if (afterId) params.afterId = afterId;
    if (!markRead) params.markRead = 'false';
    const response = await apiClient.get<GetTransactionChatMessagesResponse>(
      `/transactions/${transactionId}/chat/messages`,
      { params: Object.keys(params).length ? params : undefined }
    );
    return response.data;
  },

  /**
   * Mark transaction chat messages as read for the current user (e.g. after user interacts with an auto-opened chat).
   */
  async markTransactionChatAsRead(transactionId: string): Promise<void> {
    await apiClient.patch(`/transactions/${transactionId}/chat/read`);
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
