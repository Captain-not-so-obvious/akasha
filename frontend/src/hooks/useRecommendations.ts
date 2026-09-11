import { useState, useCallback } from 'react';
import type { RecommendedItem, RecommendationQueryOptions } from '../types/recommendation';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (options: RecommendationQueryOptions = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const limit = options.limit ?? 10;
      const mediaType = options.mediaType ?? 'all';

      const url = `${BACKEND_URL}/recommendations?limit=${limit}&mediaType=${mediaType}`;
      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Erro ao buscar recomendações inteligentes');
      }

      const data: RecommendedItem[] = await res.json();
      setRecommendations(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar recomendações';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { recommendations, isLoading, error, fetchRecommendations };
}
