import { ApiError } from '../api/client';

export type ErrorCode =
  | 'OPTIMISTIC_LOCK_CONFLICT'
  | 'INSUFFICIENT_FUNDS'
  | 'TICKET_NOT_AVAILABLE'
  | 'RESOURCE_CONFLICT'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'INTERNAL_SERVER_ERROR'
  | string;

export interface ErrorHandlerOptions {
  onConflict?: (error: ApiError) => void;
  onInsufficientFunds?: (error: ApiError) => void;
  onTicketNotAvailable?: (error: ApiError) => void;
  onUnauthorized?: (error: ApiError) => void;
  onNotFound?: (error: ApiError) => void;
  onDefault?: (error: ApiError) => void;
}

/**
 * Routes API errors to appropriate handlers based on error code
 */
export function handleApiError(
  error: ApiError,
  options: ErrorHandlerOptions = {}
): void {
  const {
    onConflict,
    onInsufficientFunds,
    onTicketNotAvailable,
    onUnauthorized,
    onNotFound,
    onDefault,
  } = options;

  switch (error.code) {
    case 'OPTIMISTIC_LOCK_CONFLICT':
    case 'RESOURCE_CONFLICT':
      if (onConflict) {
        onConflict(error);
        return;
      }
      break;

    case 'INSUFFICIENT_FUNDS':
      if (onInsufficientFunds) {
        onInsufficientFunds(error);
        return;
      }
      break;

    case 'TICKET_NOT_AVAILABLE':
      if (onTicketNotAvailable) {
        onTicketNotAvailable(error);
        return;
      }
      break;

    case 'UNAUTHORIZED':
      if (onUnauthorized) {
        onUnauthorized(error);
        return;
      }
      break;

    case 'NOT_FOUND':
      if (onNotFound) {
        onNotFound(error);
        return;
      }
      break;
  }

  // Fallback to status code based routing if no code handler matched
  if (!error.code) {
    if (error.statusCode === 401 && onUnauthorized) {
      onUnauthorized(error);
      return;
    }
    if (error.statusCode === 404 && onNotFound) {
      onNotFound(error);
      return;
    }
    if (error.statusCode === 409 && onConflict) {
      onConflict(error);
      return;
    }
  }

  // Default handler
  if (onDefault) {
    onDefault(error);
  }
}

/**
 * Checks if an error is retryable based on backend response
 */
export function isRetryableError(error: ApiError): boolean {
  return error.details?.retryable === true;
}

/**
 * Gets the user-facing error message
 */
export function getErrorMessage(error: ApiError): string {
  return error.message || 'An unexpected error occurred';
}

/**
 * Checks if the error is a conflict error (optimistic locking)
 */
export function isConflictError(error: ApiError): boolean {
  return (
    error.code === 'OPTIMISTIC_LOCK_CONFLICT' ||
    error.code === 'RESOURCE_CONFLICT' ||
    error.statusCode === 409
  );
}

/**
 * Gets the resource name from error details
 */
export function getErrorResourceName(error: ApiError): string | undefined {
  return error.details?.resource;
}
