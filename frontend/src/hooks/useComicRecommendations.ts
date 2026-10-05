import { useState, useCallback } from 'react';
import type { ComicRecommendationItem } from '../types/comic';
import { apiFetch } from '../lib/api';

export function useComicRecommendations() {
  const [recommendations, setRecommendations] = useState<ComicRecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/comics/recommendations?limit=${limit}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar recomendações de quadrinhos');
      }

      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar recomendações de quadrinhos';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { recommendations, isLoading, error, fetchRecommendations };
}
