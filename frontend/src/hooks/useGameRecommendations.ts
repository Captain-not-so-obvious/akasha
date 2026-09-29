import { useState, useCallback } from 'react';
import type { GameRecommendationItem } from '../types/game';
import { apiFetch } from '../lib/api';

export function useGameRecommendations() {
  const [recommendations, setRecommendations] = useState<GameRecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/games/recommendations?limit=${limit}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar recomendações de jogos');
      }

      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar recomendações de jogos';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { recommendations, isLoading, error, fetchRecommendations };
}
