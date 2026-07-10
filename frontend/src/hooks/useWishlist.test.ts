import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useWishlist } from './useWishlist';

// Mock getAuthToken
vi.mock('../utils/auth', () => ({
  getAuthToken: vi.fn(() => Promise.resolve('fake-token'))
}));

describe('useWishlist', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn() as Mock;
  });

  it('deve retornar os itens iniciais corretamente', () => {
    const { result } = renderHook(() => useWishlist());
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetchWishlist deve lidar com os requests com sucesso', async () => {
    // Mock do /wishlist
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 1, tmdbId: 10, mediaType: 'movie', status: 'plan_to_watch' }])
    });

    // Mock do /tmdb/:type/:id
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 10, title: 'Fake Movie' })
    });

    const { result } = renderHook(() => useWishlist());

    await act(async () => {
      await result.current.fetchWishlist();
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].media.title).toBe('Fake Movie');
  });
});
