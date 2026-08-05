import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { useRecommendations } from './useRecommendations';

vi.mock('../utils/auth', () => ({
  getAuthToken: vi.fn(() => Promise.resolve('fake-jwt-token')),
}));

describe('useRecommendations hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    globalThis.fetch = vi.fn() as Mock;
  });

  it('deve inicializar com lista vazia e sem carregamento', () => {
    const { result } = renderHook(() => useRecommendations());
    expect(result.current.recommendations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('deve buscar e carregar recomendações com sucesso', async () => {
    const mockData = [
      {
        tmdbId: 100,
        title: 'Interstellar',
        overview: '...',
        posterUrl: '/poster.jpg',
        backdropUrl: '/backdrop.jpg',
        mediaType: 'movie',
        voteAverage: 8.6,
        reason: 'Porque você avaliou com 5★',
        score: 98,
        isColdStart: false,
      },
    ];

    (globalThis.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations({ limit: 10, mediaType: 'movie' });
    });

    expect(result.current.recommendations).toHaveLength(1);
    expect(result.current.recommendations[0].title).toBe('Interstellar');
    expect(result.current.recommendations[0].score).toBe(98);
    expect(result.current.isLoading).toBe(false);
  });
});
