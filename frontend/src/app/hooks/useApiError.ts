import { useState, useCallback } from 'react';
import { ApiError } from '../../api/client';
import {
  handleApiError,
  ErrorHandlerOptions,
  getErrorMessage,
  isRetryableError,
  isConflictError,
} from '../../lib/error-handler';

export interface UseApiErrorReturn {
  error: ApiError | null;
  errorMessage: string | null;
  isRetryable: boolean;
  showConflictModal: boolean;
  setError: (error: ApiError | null) => void;
  clearError: () => void;
  handleError: (error: ApiError, options?: ErrorHandlerOptions) => void;
  closeConflictModal: () => void;
}

/**
 * React hook for centralized API error handling
 */
export function useApiError(): UseApiErrorReturn {
  const [error, setErrorState] = useState<ApiError | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const setError = useCallback((newError: ApiError | null) => {
    setErrorState(newError);
    if (newError && isConflictError(newError)) {
      setShowConflictModal(true);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
    setShowConflictModal(false);
  }, []);

  const closeConflictModal = useCallback(() => {
    setShowConflictModal(false);
  }, []);

  const handleError = useCallback(
    (err: ApiError, options: ErrorHandlerOptions = {}) => {
      setError(err);

      // Wrap conflict handler to show modal
      const wrappedOptions: ErrorHandlerOptions = {
        ...options,
        onConflict: (conflictError) => {
          setShowConflictModal(true);
          options.onConflict?.(conflictError);
        },
      };

      handleApiError(err, wrappedOptions);
    },
    [setError]
  );

  return {
    error,
    errorMessage: error ? getErrorMessage(error) : null,
    isRetryable: error ? isRetryableError(error) : false,
    showConflictModal,
    setError,
    clearError,
    handleError,
    closeConflictModal,
  };
}
