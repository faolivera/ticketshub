import apiClient from '../client';
import type {
  AuthenticatedUserPublicInfo,
  MyBankAccount,
  ListAdminBankAccountsResponse,
} from '../types';

export interface UpdateBankAccountRequest {
  holderName: string;
  cbuOrCvu: string;
  alias?: string;
}

/**
 * Users service for user-related API operations
 */
export const usersService = {
  /**
   * Upgrade current user to seller level
   */
  async upgradeToSeller(): Promise<AuthenticatedUserPublicInfo> {
    const response = await apiClient.put<AuthenticatedUserPublicInfo>(
      '/users/upgrade-to-seller'
    );
    return response.data;
  },

  /**
   * Upload user avatar image
   */
  async uploadAvatar(file: File): Promise<AuthenticatedUserPublicInfo> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<AuthenticatedUserPublicInfo>(
      '/users/profile/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Get current user's bank account (for profile/bank-account form). Returns null if none.
   */
  async getBankAccount(): Promise<MyBankAccount | null> {
    const response = await apiClient.get<MyBankAccount | null>('/users/bank-account');
    return response.data;
  },

  /**
   * Update current user's bank account (V4). Used for payouts.
   */
  async updateBankAccount(
    data: UpdateBankAccountRequest
  ): Promise<AuthenticatedUserPublicInfo> {
    const response = await apiClient.put<AuthenticatedUserPublicInfo>(
      '/users/bank-account',
      data
    );
    return response.data;
  },

  /**
   * List all users with bank account and full bank data (admin only).
   */
  async listBankAccountsForAdmin(): Promise<ListAdminBankAccountsResponse> {
    const response = await apiClient.get<ListAdminBankAccountsResponse>(
      '/users/admin/bank-accounts'
    );
    return response.data;
  },

  /**
   * Update bank account verification status (admin only).
   */
  async updateBankAccountStatus(
    userId: string,
    status: 'approved' | 'rejected',
  ): Promise<AuthenticatedUserPublicInfo> {
    const response = await apiClient.patch<AuthenticatedUserPublicInfo>(
      `/users/admin/bank-account-status/${userId}`,
      { status },
    );
    return response.data;
  },
};

export default usersService;
