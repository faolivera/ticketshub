import apiClient from '../client';
import type { AuthenticatedUserPublicInfo } from '../types';

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
};

export default usersService;
