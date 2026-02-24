import apiClient, { setToken, removeToken } from '../client';
import type { LoginRequest, LoginResponse, AuthenticatedUserPublicInfo } from '../types';

/**
 * Authentication service
 */
export const authService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/users/login', credentials);
    const data = response.data;
    
    // Store the token
    setToken(data.token);
    
    return data;
  },

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<AuthenticatedUserPublicInfo> {
    const response = await apiClient.get<AuthenticatedUserPublicInfo>('/users/me');
    return response.data;
  },

  /**
   * Logout - clear stored token
   */
  logout(): void {
    removeToken();
  },
};

export default authService;
