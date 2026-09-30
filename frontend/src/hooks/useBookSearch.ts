import { useState, useEffect, useCallback } from 'react';
import type { BookDetails } from '../types/book';
import { apiFetch } from '../lib/api';

const DEBOUNCE_DELAY_MS = 400;

export interface UseBookSearchReturn {
  results: BookDetails[];
  popularBooks: BookDetails[];
  isLoading: boolean;
  error: string | null;
  /** Força nova requisição */
  refetch: () => void;
}

/**
 * Hook para busca de livros via Google Books com debounce e catálogo de clássicos/populares em cold-start.
 *
 * Acessibilidade e Plataformas:
 * - TV/D-Pad: O debounce previne requisições excessivas enquanto o usuário navega com o controle no teclado virtual.
 * - Mobile/Desktop: Carrega previamente obras clássicas e aclamadas para que a estante nunca fique vazia.
 */
export function useBookSearch(query: string): UseBookSearchReturn {
  const [results, setResults] = useState<BookDetails[]>([]);
  const [popularBooks, setPopularBooks] = useState<BookDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger((n) => n + 1);
  }, []);

  // Busca lista de livros populares/clássicos para exibir quando não há busca ativa
  useEffect(() => {
    let cancelled = false;

    apiFetch('/books/popular?limit=12')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { results?: BookDetails[] };
        if (!cancelled && data.results) {
          setPopularBooks(data.results);
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
    // Se a query for menor que 2 caracteres, limpa resultados da busca
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
        const response = await apiFetch(`/books/search?q=${encodeURIComponent(query.trim())}&limit=24`);

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? `Erro HTTP ${response.status}`);
        }

        const data = (await response.json()) as { results?: BookDetails[] };

        if (!cancelled) {
          setResults(data.results || []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erro ao buscar livros.';
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
  }, [query, fetchTrigger]);

  return { results, popularBooks, isLoading, error, refetch };
}
