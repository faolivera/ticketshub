import apiClient, { setToken, removeToken } from '../client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  AuthenticatedUserPublicInfo,
} from '../types';

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
   * Register with email, password, and profile
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/users/register', data);
    const result = response.data;

    // Store the token
    setToken(result.token);

    return result;
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
