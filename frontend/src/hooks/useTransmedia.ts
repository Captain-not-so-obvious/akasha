import { useState, useCallback } from 'react';
import type {
  TransmediaRecommendationItem,
  ArchiveStatsResponse,
  CanonicalFranchiseSummary,
} from '../types/transmedia';
import { apiFetch } from '../lib/api';

export function useTransmedia() {
  const [recommendations, setRecommendations] = useState<TransmediaRecommendationItem[]>([]);
  const [stats, setStats] = useState<ArchiveStatsResponse | null>(null);
  const [franchises, setFranchises] = useState<CanonicalFranchiseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (limit: number = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/transmedia/recommendations?limit=${limit}`);
      if (!res.ok) {
        throw new Error('Erro ao buscar conexões transmídia');
      }
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar conexões transmídia';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/transmedia/stats');
      if (!res.ok) {
        throw new Error('Erro ao buscar métricas do acervo');
      }
      const data: ArchiveStatsResponse = await res.json();
      setStats(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar métricas do acervo';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFranchises = useCallback(async () => {
    try {
      const res = await apiFetch('/transmedia/franchises');
      if (res.ok) {
        const data = await res.json();
        setFranchises(data.franchises || []);
      }
    } catch {
      // Ignora erro silencioso no catálogo geral
    }
  }, []);

  return {
    recommendations,
    stats,
    franchises,
    isLoading,
    error,
    fetchRecommendations,
    fetchStats,
    fetchFranchises,
  };
}
