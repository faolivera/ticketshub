import { useState, useEffect, useCallback, useRef } from 'react';
import { eventsService } from '@/api/services/events.service';
import type { EventSelectItem } from '@/api/types';

const PAGE_SIZE = 12;
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

export function useEventSelection(): UseEventSelectionReturn {
  const [events, setEvents] = useState<EventSelectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTermState] = useState('');
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offsetRef = useRef(0);

  const fetchEvents = useCallback(async (search: string, offset: number, append: boolean) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await eventsService.getEventsForSelection({
        search: search || undefined,
        limit: PAGE_SIZE,
        offset,
      });

      if (append) {
        setEvents((prev) => [...prev, ...response.events]);
      } else {
        setEvents(response.events);
      }

      setTotal(response.total);
      setHasMore(response.hasMore);
      offsetRef.current = offset + response.events.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchTermState(term);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        offsetRef.current = 0;
        fetchEvents(term, 0, false);
      }, DEBOUNCE_MS);
    },
    [fetchEvents]
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await fetchEvents(searchTerm, offsetRef.current, true);
  }, [fetchEvents, searchTerm, isLoadingMore, hasMore]);

  const refresh = useCallback(async () => {
    offsetRef.current = 0;
    await fetchEvents(searchTerm, 0, false);
  }, [fetchEvents, searchTerm]);

  useEffect(() => {
    fetchEvents('', 0, false);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchEvents]);

  return {
    events,
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
