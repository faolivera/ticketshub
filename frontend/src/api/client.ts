import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

/**
 * Standard API response wrapper from backend
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Structured error details from backend
 */
export interface ApiErrorDetails {
  code: string;
  message: string;
  details?: {
    resource?: string;
    resourceId?: string;
    retryable?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Normalized API error
 */
export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: ApiErrorDetails['details'];
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

      // Extract and normalize error
      const errorData = extractErrorData(error);
      const apiError: ApiError = {
        message: errorData.message,
        statusCode: error.response?.status ?? 500,
        code: errorData.code,
        details: errorData.details,
        errors: errorData.errors,
      };

      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * Backend error response structure
 */
interface BackendErrorResponse {
  success: false;
  error?: ApiErrorDetails;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Extract structured error data from axios error
 */
function extractErrorData(error: AxiosError): {
  message: string;
  code?: string;
  details?: ApiErrorDetails['details'];
  errors?: Record<string, string[]>;
} {
  const data = error.response?.data as BackendErrorResponse | undefined;

  // New structured error format: { success: false, error: { code, message, details } }
  if (data?.error && typeof data.error === 'object') {
    return {
      message: data.error.message || 'An unexpected error occurred',
      code: data.error.code,
      details: data.error.details,
      errors: undefined,
    };
  }

  // Legacy format: { message, errors }
  return {
    message: data?.message ? String(data.message) : error.message || 'An unexpected error occurred',
    code: undefined,
    details: undefined,
    errors: data?.errors && typeof data.errors === 'object'
      ? data.errors as Record<string, string[]>
      : undefined,
  };
}

/**
 * Configured API client instance
 */
export const apiClient = createApiClient();

export default apiClient;
