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
};

export default usersService;
