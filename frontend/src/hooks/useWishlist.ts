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
          const mediaRes = await apiFetch(`/tmdb/${item.mediaType}/${item.tmdbId}`);
          if (!mediaRes.ok) throw new Error(`Erro ao buscar mídia ${item.tmdbId}`);
          const media: MediaDetails = await mediaRes.json();
          return { ...item, media };
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
      
      await fetchWishlist(); // Recarrega a lista para obter os detalhes de mídia mais recentes
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
