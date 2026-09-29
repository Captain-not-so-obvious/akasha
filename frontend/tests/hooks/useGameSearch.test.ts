import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameSearch } from '../../src/hooks/useGameSearch';
import { apiFetch } from '../../src/lib/api';
import type { GameDetails } from '../../src/types/game';

vi.mock('../../src/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockGames: GameDetails[] = [
  {
    id: '1022',
    title: 'The Legend of Zelda',
    coverUrl: 'https://images.igdb.com/cover.jpg',
    backdropUrl: null,
    releaseYear: 1986,
    genres: ['Adventure'],
    platforms: ['NES'],
    rating: 81,
  },
];

describe('Hook useGameSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não dispara busca se a query tiver menos de 2 caracteres', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    const { result } = renderHook(() => useGameSearch('a'));

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('busca jogos com debounce após 400ms para query válida', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }), // popular
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockGames }), // search
      } as Response);

    const { result } = renderHook(() => useGameSearch('Zelda'));

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(result.current.results[0].title).toBe('The Legend of Zelda');
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/games/search?q=Zelda'));
  });

  it('preenche o estado de erro quando a API falha', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Falha no IGDB' }),
      } as Response);

    const { result } = renderHook(() => useGameSearch('Dark Souls'));

    await waitFor(() => {
      expect(result.current.error).toBe('Falha no IGDB');
    });

    expect(result.current.results).toEqual([]);
  });
});
