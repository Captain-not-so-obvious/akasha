import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import type { ComparisonResult, FriendRecommendationItem } from '../types/comparison';

export function useFriendComparison(friendId: string | null, domainFilter?: string) {
  const [data, setData] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    if (!friendId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url =
        domainFilter && domainFilter !== 'all'
          ? `/friends/${friendId}/compare?domain=${domainFilter}`
          : `/friends/${friendId}/compare`;

      const res = await apiFetch(url);

      if (res.status === 403) {
        throw new Error('Você só pode sincronizar acervos com amigos confirmados.');
      }

      if (res.status === 404) {
        throw new Error('Viajante não encontrado.');
      }

      if (!res.ok) {
        throw new Error('Erro ao sincronizar acervos cósmicos.');
      }

      const result: ComparisonResult = await res.json();
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar comparação.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [friendId, domainFilter]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const addToBacklog = useCallback(
    async (item: FriendRecommendationItem) => {
      try {
        const payload: Record<string, unknown> = {
          domain: item.domain,
          externalId: item.externalId,
          status: 'plan_to_watch',
          title: item.title,
          coverUrl: item.coverUrl || undefined,
          posterPath: item.coverUrl || undefined,
          releaseYear: item.releaseYear || undefined,
        };

        if (item.tmdbId) {
          payload.tmdbId = item.tmdbId;
        }
        if (item.mediaType) {
          payload.mediaType = item.mediaType;
        }

        const res = await apiFetch('/wishlist', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error('Não foi possível adicionar a obra ao seu acervo.');
        }

        // Atualização otimista na lista de recomendações
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            friendRecommendations: prev.friendRecommendations.map((rec) => {
              const matchByDomainExtId =
                rec.domain === item.domain && rec.externalId === item.externalId;
              const matchByLegacyTmdb =
                rec.tmdbId &&
                item.tmdbId &&
                rec.tmdbId === item.tmdbId &&
                rec.mediaType === item.mediaType;

              return matchByDomainExtId || matchByLegacyTmdb
                ? { ...rec, inMyBacklog: true }
                : rec;
            }),
          };
        });

        setActionFeedback(`"${item.title}" foi adicionado à sua biblioteca!`);
        setTimeout(() => setActionFeedback(null), 3500);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao adicionar.';
        setActionFeedback(`Falha: ${msg}`);
        setTimeout(() => setActionFeedback(null), 3500);
        return { success: false, message: msg };
      }
    },
    []
  );

  return {
    data,
    isLoading,
    error,
    actionFeedback,
    refetch: fetchComparison,
    addToBacklog,
  };
}
