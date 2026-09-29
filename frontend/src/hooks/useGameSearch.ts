import { useState, useEffect, useCallback } from 'react';
import type { GameDetails } from '../types/game';
import { apiFetch } from '../lib/api';

const DEBOUNCE_DELAY_MS = 400;

export interface UseGameSearchReturn {
  results: GameDetails[];
  popularGames: GameDetails[];
  isLoading: boolean;
  error: string | null;
  /** Força nova requisição */
  refetch: () => void;
}

/**
 * Hook para busca de jogos via IGDB com debounce e catálogo de populares em cold-start.
 *
 * Acessibilidade e Plataformas:
 * - TV/D-Pad: O debounce previne requisições excessivas enquanto o usuário navega com o controle no teclado virtual.
 * - Mobile/Desktop: Carrega previamente títulos populares para que a tela nunca fique vazia.
 */
export function useGameSearch(query: string): UseGameSearchReturn {
  const [results, setResults] = useState<GameDetails[]>([]);
  const [popularGames, setPopularGames] = useState<GameDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger((n) => n + 1);
  }, []);

  // Busca lista de jogos populares para exibir quando não há busca ativa
  useEffect(() => {
    let cancelled = false;

    apiFetch('/games/popular?limit=12')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { results?: GameDetails[] };
        if (!cancelled && data.results) {
          setPopularGames(data.results);
        }
      })
      .catch(() => {
        // Fallback gracioso se a rota falhar
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
        const response = await apiFetch(`/games/search?q=${encodeURIComponent(query.trim())}&limit=24`);

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? `Erro HTTP ${response.status}`);
        }

        const data = (await response.json()) as { results?: GameDetails[] };

        if (!cancelled) {
          setResults(data.results || []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erro ao buscar jogos.';
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

  return { results, popularGames, isLoading, error, refetch };
}
