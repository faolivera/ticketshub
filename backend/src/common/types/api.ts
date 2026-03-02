// Common types for the backend

/**
 * Structured error details for API responses.
 * Contains machine-readable code and optional context.
 */
export interface ApiErrorDetails {
  code: string; // 'OPTIMISTIC_LOCK_CONFLICT' | 'INSUFFICIENT_FUNDS' | etc.
  message: string; // Human-readable message
  details?: {
    resource?: string; // 'Wallet' | 'TicketListing' | etc.
    resourceId?: string;
    retryable?: boolean;
    [key: string]: unknown; // Additional context
  };
}

/**
 * Standard API response wrapper.
 * All API responses should use this structure.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetails;
}
