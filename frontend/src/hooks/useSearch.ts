import { useState, useEffect, useCallback } from 'react';
import type { MediaType, SearchResult, MediaDetails } from '../types/media';
import { getAuthToken } from '../utils/auth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';
const DEBOUNCE_DELAY_MS = 400;

interface UseSearchReturn {
  results: MediaDetails[];
  totalResults: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  /** Função para forçar uma nova busca com os parâmetros atuais */
  refetch: () => void;
}

/**
 * Hook responsável por buscar mídias no backend com debounce automático.
 *
 * Comportamento de plataforma:
 * - TV/D-Pad: O debounce evita excesso de requisições ao navegar letra por letra com o controle remoto.
 * - Mobile/Desktop: Proporciona busca em tempo real sem travar a UI.
 *
 * @param query - Termo de busca (mínimo 2 caracteres para disparar a request).
 * @param mediaType - 'movie' para filmes, 'tv' para séries.
 */
export function useSearch(query: string, mediaType: MediaType): UseSearchReturn {
  const [results, setResults] = useState<MediaDetails[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    // Limpa os resultados ao trocar de tipo ou ao query ser curto demais
    if (query.trim().length < 2) {
      setResults([]);
      setTotalResults(0);
      setTotalPages(0);
      setError(null);
      return;
    }

    let cancelled = false;

    const timerId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const url = `${BACKEND_URL}/tmdb/search?q=${encodeURIComponent(query.trim())}&type=${mediaType}`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
          const body = await response.json() as { error?: string };
          throw new Error(body.error ?? `Erro HTTP ${response.status}`);
        }

        const data: SearchResult = await response.json() as SearchResult;

        if (!cancelled) {
          setResults(data.results);
          setTotalResults(data.totalResults);
          setTotalPages(data.totalPages);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido na busca.';
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
  }, [query, mediaType, fetchTrigger]);

  return { results, totalResults, totalPages, isLoading, error, refetch };
}
