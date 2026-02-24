import apiClient from '../client';
import type {
  GetWalletResponse,
  ListWalletTransactionsResponse,
  WithdrawRequest,
  WithdrawResponse,
} from '../types';

/**
 * Wallet service
 */
export const walletService = {
  /**
   * Get wallet balance
   */
  async getWallet(): Promise<GetWalletResponse> {
    const response = await apiClient.get<GetWalletResponse>('/wallet');
    return response.data;
  },

  /**
   * Get wallet transactions
   */
  async getTransactions(): Promise<ListWalletTransactionsResponse> {
    const response = await apiClient.get<ListWalletTransactionsResponse>('/wallet/transactions');
    return response.data;
  },

  /**
   * Request withdrawal
   */
  async withdraw(data: WithdrawRequest): Promise<WithdrawResponse> {
    const response = await apiClient.post<WithdrawResponse>('/wallet/withdraw', data);
    return response.data;
  },
};

export default walletService;
