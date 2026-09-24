import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { ActivityItem, ActivityFeedResponse } from '../types/activity';

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchFeed = useCallback(async (targetPage = 1, append = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/feed?page=${targetPage}&limit=20`);
      if (!res.ok) {
        throw new Error('Falha ao carregar feed de atividades.');
      }
      const data: ActivityFeedResponse = await res.json();
      
      setActivities((prev) => (append ? [...prev, ...data.activities] : data.activities));
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar feed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  const loadMore = useCallback(() => {
    if (page < totalPages && !isLoading) {
      fetchFeed(page + 1, true);
    }
  }, [page, totalPages, isLoading, fetchFeed]);

  const refresh = useCallback(() => {
    fetchFeed(1, false);
  }, [fetchFeed]);

  return {
    activities,
    isLoading,
    error,
    page,
    totalPages,
    total,
    loadMore,
    refresh,
  };
}
