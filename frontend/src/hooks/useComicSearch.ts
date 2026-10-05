import { useState, useEffect, useCallback } from 'react';
import type { ComicDetails } from '../types/comic';
import { apiFetch } from '../lib/api';

const DEBOUNCE_DELAY_MS = 400;

export interface UseComicSearchReturn {
  results: ComicDetails[];
  popularComics: ComicDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para busca de Sagas e Mangás com debounce e catálogo de clássicos em cold-start.
 */
export function useComicSearch(query: string, type: 'all' | 'comic' | 'manga' = 'all'): UseComicSearchReturn {
  const [results, setResults] = useState<ComicDetails[]>([]);
  const [popularComics, setPopularComics] = useState<ComicDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger((n) => n + 1);
  }, []);

  // Busca lista de sagas e mangás consagrados para exibir quando não há busca ativa
  useEffect(() => {
    let cancelled = false;

    apiFetch('/comics/popular?limit=12')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { results?: ComicDetails[] };
        if (!cancelled && data.results) {
          setPopularComics(data.results);
        }
      })
      .catch(() => {
        // Fallback silencioso
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const timerId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch(
          `/comics/search?q=${encodeURIComponent(query.trim())}&type=${type}&limit=24`
        );

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? `Erro HTTP ${response.status}`);
        }

        const data = (await response.json()) as { results?: ComicDetails[] };

        if (!cancelled) {
          setResults(data.results || []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erro ao buscar quadrinhos e mangás.';
          setError(message);
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [query, type, fetchTrigger]);

  return { results, popularComics, isLoading, error, refetch };
}
