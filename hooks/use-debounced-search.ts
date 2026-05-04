/**
 * useDebouncedSearch
 *
 * Reusable hook for debounced search of stages via GET /stages/search?q=...
 * Used in member creation form for the single searchable stage dropdown.
 *
 * @param delayMs - debounce delay in milliseconds (default: 300)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { stagesAdminApi, type AdminStage } from '@/lib/api-client';

interface UseDebouncedSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: AdminStage[];
  isLoading: boolean;
  error: string | null;
  selected: AdminStage | null;
  setSelected: (stage: AdminStage | null) => void;
}

export function useDebouncedSearch(delayMs = 300): UseDebouncedSearchResult {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminStage | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await stagesAdminApi.list({ search: q.trim(), limit: 20 });
      if (res.success && res.data) {
        setResults(res.data.data ?? []);
      } else {
        setError(res.error?.message ?? 'Search failed');
        setResults([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      void doSearch(query);
    }, delayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, delayMs, doSearch]);

  return { query, setQuery, results, isLoading, error, selected, setSelected };
}
