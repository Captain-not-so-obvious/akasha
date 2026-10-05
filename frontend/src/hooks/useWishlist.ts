import { useState, useCallback } from 'react';
import type { CreateWishlistItemInput, LibraryItem, UpdateWishlistItemInput, WishlistItem } from '../types/wishlist';
import type { MediaDetails } from '../types/media';
import { apiFetch } from '../lib/api';

export function useWishlist() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/wishlist');
      if (res.status === 401) throw new Error('Não autenticado');
      if (!res.ok) throw new Error('Erro ao buscar biblioteca');
      
      const wishlistItems: WishlistItem[] = await res.json();

      // Buscando detalhes da mídia para cada item
      const libraryItems: LibraryItem[] = await Promise.all(
        wishlistItems.map(async (item) => {
          if (item.domain === 'comic') {
            const meta = item.extraMeta as Record<string, unknown> | null | undefined;
            const comicMedia: MediaDetails = {
              id: Number(item.externalId) || item.id,
              title: item.title || 'Quadrinho sem título',
              overview: typeof meta?.description === 'string' ? meta.description : '',
              posterUrl: item.coverUrl || '',
              backdropUrl: '',
              mediaType: 'movie',
              releaseDate: item.releaseYear ? `${item.releaseYear}-01-01` : '',
              voteAverage: typeof meta?.rating === 'number' ? (meta.rating as number) / 10 : 0,
            };
            return { ...item, media: comicMedia };
          }

          if (item.domain === 'book') {
            const meta = item.extraMeta as Record<string, unknown> | null | undefined;
            const bookMedia: MediaDetails = {
              id: Number(item.externalId) || item.id,
              title: item.title || 'Livro sem título',
              overview: typeof meta?.description === 'string' ? meta.description : '',
              posterUrl: item.coverUrl || '',
              backdropUrl: '',
              mediaType: 'movie',
              releaseDate: item.releaseYear ? `${item.releaseYear}-01-01` : '',
              voteAverage: 0,
            };
            return { ...item, media: bookMedia };
          }

          if (item.domain === 'game' || (!item.tmdbId && item.externalId)) {
            const meta = item.extraMeta as Record<string, unknown> | null | undefined;
            const gameMedia: MediaDetails = {
              id: Number(item.externalId) || item.id,
              title: item.title || 'Jogo sem título',
              overview: typeof meta?.summary === 'string' ? meta.summary : '',
              posterUrl: item.coverUrl || '',
              backdropUrl: typeof meta?.backdropUrl === 'string' ? meta.backdropUrl : '',
              mediaType: 'movie',
              releaseDate: item.releaseYear ? `${item.releaseYear}-01-01` : '',
              voteAverage: typeof meta?.rating === 'number' ? (meta.rating as number) / 10 : 0,
            };
            return { ...item, media: gameMedia };
          }

          if (item.tmdbId && item.mediaType) {
            try {
              const mediaRes = await apiFetch(`/tmdb/${item.mediaType}/${item.tmdbId}`);
              if (mediaRes.ok) {
                const media: MediaDetails = await mediaRes.json();
                return { ...item, media };
              }
            } catch {
              // fallback em caso de erro no TMDB
            }
          }

          const fallbackMedia: MediaDetails = {
            id: Number(item.externalId) || item.tmdbId || item.id,
            title: item.title || 'Sem título',
            overview: '',
            posterUrl: item.coverUrl || '',
            backdropUrl: '',
            mediaType: 'movie',
            releaseDate: item.releaseYear ? `${item.releaseYear}-01-01` : '',
            voteAverage: 0,
          };
          return { ...item, media: fallbackMedia };
        })
      );

      setItems(libraryItems);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addToList = useCallback(async (data: CreateWishlistItemInput) => {
    try {
      const res = await apiFetch('/wishlist', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Erro ao adicionar à biblioteca');

      const createdItem: WishlistItem = await res.json();

      // Atualização imediata do state para que a tag 'Na Biblioteca' apareça no mesmo instante
      const meta = createdItem.extraMeta as Record<string, unknown> | null | undefined;
      const mediaOverview =
        typeof meta?.description === 'string'
          ? meta.description
          : typeof meta?.summary === 'string'
          ? meta.summary
          : '';

      const newLibItem: LibraryItem = {
        ...createdItem,
        media: {
          id: Number(createdItem.externalId) || createdItem.id,
          title: createdItem.title || 'Sem título',
          overview: mediaOverview,
          posterUrl: createdItem.coverUrl || '',
          backdropUrl: typeof meta?.backdropUrl === 'string' ? meta.backdropUrl : '',
          mediaType: 'movie',
          releaseDate: createdItem.releaseYear ? `${createdItem.releaseYear}-01-01` : '',
          voteAverage: typeof meta?.rating === 'number' ? (meta.rating as number) / 10 : 0,
        },
      };

      setItems((prev) => {
        const filtered = prev.filter(
          (p) => !(p.domain === createdItem.domain && p.externalId === createdItem.externalId)
        );
        return [newLibItem, ...filtered];
      });

      // Recarrega em background para sincronizar eventuais enriquecimentos
      fetchWishlist().catch(() => {});
    } catch (err: unknown) {
      console.error('Erro em addToList:', err);
      throw err;
    }
  }, [fetchWishlist]);

  const updateListItem = useCallback(async (id: number, data: UpdateWishlistItemInput) => {
    try {
      const res = await apiFetch(`/wishlist/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Erro ao atualizar item');
      
      // Atualiza o state local otimisticamente
      const updatedItem: WishlistItem = await res.json();
      setItems((prev) => prev.map(item => item.id === id ? { ...item, ...updatedItem } : item));
    } catch (err: unknown) {
      console.error('Erro em updateListItem:', err);
      throw err;
    }
  }, []);

  const removeFromList = useCallback(async (id: number) => {
    try {
      const res = await apiFetch(`/wishlist/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erro ao remover item');
      
      setItems((prev) => prev.filter(item => item.id !== id));
    } catch (err: unknown) {
      console.error('Erro em removeFromList:', err);
      throw err;
    }
  }, []);

  return { items, isLoading, error, fetchWishlist, addToList, updateListItem, removeFromList };
}
