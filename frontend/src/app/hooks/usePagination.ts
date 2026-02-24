import { useState, useCallback, useMemo } from 'react';

interface PaginationState {
  page: number;
  limit: number;
  offset: number;
}

interface UsePaginationReturn extends PaginationState {
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setLimit: (limit: number) => void;
  reset: () => void;
  hasMore: (totalItems: number) => boolean;
  totalPages: (totalItems: number) => number;
}

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

/**
 * Hook for managing pagination state
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialLimit = 10 } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);

  const nextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPage(1); // Reset to first page when limit changes
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setLimitState(initialLimit);
  }, [initialPage, initialLimit]);

  const hasMore = useCallback(
    (totalItems: number) => {
      return page * limit < totalItems;
    },
    [page, limit]
  );

  const totalPages = useCallback(
    (totalItems: number) => {
      return Math.ceil(totalItems / limit);
    },
    [limit]
  );

  return {
    page,
    limit,
    offset,
    nextPage,
    prevPage,
    goToPage,
    setLimit,
    reset,
    hasMore,
    totalPages,
  };
}

export default usePagination;
