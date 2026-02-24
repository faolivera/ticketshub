import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

/**
 * Standard API response wrapper from backend
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Normalized API error
 */
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

const TOKEN_KEY = 'auth_token';

/**
 * Get stored auth token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store auth token
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove auth token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Create configured axios instance
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: attach auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: extract data, handle errors
  client.interceptors.response.use(
    (response) => {
      // Extract data from ApiResponse wrapper
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        return { ...response, data: response.data.data };
      }
      return response;
    },
    (error: AxiosError) => {
      // Handle 401 - unauthorized
      if (error.response?.status === 401) {
        removeToken();
        // Optionally redirect to login or dispatch auth event
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }

      // Normalize error
      const apiError: ApiError = {
        message: getErrorMessage(error),
        statusCode: error.response?.status ?? 500,
        errors: getValidationErrors(error),
      };

      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * Extract error message from axios error
 */
function getErrorMessage(error: AxiosError): string {
  const data = error.response?.data as Record<string, unknown> | undefined;
  
  if (data?.message) {
    return String(data.message);
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Extract validation errors from axios error
 */
function getValidationErrors(error: AxiosError): Record<string, string[]> | undefined {
  const data = error.response?.data as Record<string, unknown> | undefined;
  
  if (data?.errors && typeof data.errors === 'object') {
    return data.errors as Record<string, string[]>;
  }
  
  return undefined;
}

/**
 * Configured API client instance
 */
export const apiClient = createApiClient();

export default apiClient;
