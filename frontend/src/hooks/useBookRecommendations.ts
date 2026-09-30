import { useState, useCallback } from 'react';
import type { BookRecommendationItem } from '../types/book';
import { apiFetch } from '../lib/api';

export function useBookRecommendations() {
  const [recommendations, setRecommendations] = useState<BookRecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/books/recommendations?limit=${limit}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar recomendações de livros');
      }

      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar recomendações de livros';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { recommendations, isLoading, error, fetchRecommendations };
}
