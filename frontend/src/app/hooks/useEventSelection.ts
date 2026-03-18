import { useState, useEffect, useCallback, useRef } from 'react';
import { eventsService } from '@/api/services/events.service';
import type { EventSelectItem } from '@/api/types';

/** Events fetched per backend request */
const FETCH_BATCH = 9;
/** Events revealed per "Load more" click */
const DISPLAY_STEP = 3;
const DEBOUNCE_MS = 300;

interface UseEventSelectionReturn {
  events: EventSelectItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  total: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  error: string | null;
}

export function useEventSelection(initialSearchTerm?: string): UseEventSelectionReturn {
  const initial = (initialSearchTerm ?? '').trim();
  const [buffer, setBuffer] = useState<EventSelectItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTermState] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchSeqRef = useRef(0);
  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  const bufferRef = useRef<EventSelectItem[]>([]);
  const visibleRef = useRef(0);
  bufferRef.current = buffer;
  visibleRef.current = visibleCount;

  const nextBatchPromiseRef = useRef<Promise<void> | null>(null);

  const applyInitialFetch = useCallback(
    (rows: EventSelectItem[], hasMore: boolean, totalCount: number) => {
      bufferRef.current = rows;
      setBuffer(rows);
      const vis = Math.min(DISPLAY_STEP, rows.length);
      visibleRef.current = vis;
      setVisibleCount(vis);
      setServerHasMore(hasMore);
      setTotal(totalCount);
    },
    [],
  );

  const ensureNextBatchLoaded = useCallback(async (): Promise<void> => {
    if (nextBatchPromiseRef.current) {
      await nextBatchPromiseRef.current;
      return;
    }

    const seq = searchSeqRef.current;
    const offset = bufferRef.current.length;

    const p = (async () => {
      try {
        const response = await eventsService.getEventsForSelection({
          search: searchTermRef.current || undefined,
          limit: FETCH_BATCH,
          offset,
        });
        if (seq !== searchSeqRef.current) return;
        setBuffer((prev) => {
          if (prev.length !== offset) {
            return prev;
          }
          const next = [...prev, ...response.events];
          bufferRef.current = next;
          return next;
        });
        setServerHasMore(response.hasMore);
        setTotal(response.total);
      } catch (err) {
        if (seq !== searchSeqRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to load events';
        setError(message);
      }
    })();

    nextBatchPromiseRef.current = p.finally(() => {
      nextBatchPromiseRef.current = null;
    });
    await nextBatchPromiseRef.current;
  }, []);

  const fetchEvents = useCallback(
    async (search: string, offset: number, append: boolean) => {
      const seq = searchSeqRef.current;
      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const response = await eventsService.getEventsForSelection({
          search: search || undefined,
          limit: FETCH_BATCH,
          offset,
        });

        if (seq !== searchSeqRef.current) return;

        if (append) {
          setBuffer((prev) => {
            const next = [...prev, ...response.events];
            bufferRef.current = next;
            return next;
          });
          setServerHasMore(response.hasMore);
          setTotal(response.total);
        } else {
          applyInitialFetch(response.events, response.hasMore, response.total);
        }
      } catch (err) {
        if (seq !== searchSeqRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to load events';
        setError(message);
      } finally {
        if (seq === searchSeqRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [applyInitialFetch],
  );

  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchTermState(term);
      searchSeqRef.current += 1;
      nextBatchPromiseRef.current = null;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchEvents(term, 0, false);
      }, DEBOUNCE_MS);
    },
    [fetchEvents],
  );

  const loadMore = useCallback(async () => {
    const seq = searchSeqRef.current;
    const v = visibleRef.current;
    const len = bufferRef.current.length;

    if (v < len) {
      const nextVis = Math.min(v + DISPLAY_STEP, len);
      visibleRef.current = nextVis;
      setVisibleCount(nextVis);
      return;
    }

    if (!serverHasMore) return;

    setIsLoadingMore(true);
    setError(null);
    try {
      await ensureNextBatchLoaded();
      if (seq !== searchSeqRef.current) return;
      const nextVis = Math.min(visibleRef.current + DISPLAY_STEP, bufferRef.current.length);
      visibleRef.current = nextVis;
      setVisibleCount(nextVis);
    } finally {
      if (seq === searchSeqRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [serverHasMore, ensureNextBatchLoaded]);

  const refresh = useCallback(async () => {
    searchSeqRef.current += 1;
    nextBatchPromiseRef.current = null;
    const seq = searchSeqRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const response = await eventsService.getEventsForSelection({
        search: searchTermRef.current || undefined,
        limit: FETCH_BATCH,
        offset: 0,
      });
      if (seq !== searchSeqRef.current) return;
      applyInitialFetch(response.events, response.hasMore, response.total);
    } catch (err) {
      if (seq !== searchSeqRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load events';
      setError(message);
    } finally {
      if (seq === searchSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyInitialFetch]);

  useEffect(() => {
    searchSeqRef.current += 1;
    const seq = searchSeqRef.current;
    nextBatchPromiseRef.current = null;
    setIsLoading(true);
    setError(null);
    eventsService
      .getEventsForSelection({
        search: initial || undefined,
        limit: FETCH_BATCH,
        offset: 0,
      })
      .then((response) => {
        if (seq !== searchSeqRef.current) return;
        applyInitialFetch(response.events, response.hasMore, response.total);
      })
      .catch((err) => {
        if (seq !== searchSeqRef.current) return;
        const message = err instanceof Error ? err.message : 'Failed to load events';
        setError(message);
      })
      .finally(() => {
        if (seq === searchSeqRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [initial, applyInitialFetch]);

  useEffect(() => {
    if (isLoading || !serverHasMore || nextBatchPromiseRef.current) return;
    const remaining = buffer.length - visibleCount;
    if (remaining !== DISPLAY_STEP) return;
    void ensureNextBatchLoaded();
  }, [buffer.length, visibleCount, serverHasMore, isLoading, ensureNextBatchLoaded]);

  const displayed = buffer.slice(0, visibleCount);
  const hasMore = visibleCount < buffer.length || serverHasMore;

  return {
    events: displayed,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    searchTerm,
    setSearchTerm,
    loadMore,
    refresh,
    error,
  };
}
