import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useComicSearch } from '../../src/hooks/useComicSearch';
import { apiFetch } from '../../src/lib/api';
import type { ComicDetails } from '../../src/types/comic';

vi.mock('../../src/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockComics: ComicDetails[] = [
  {
    id: 'cv-4050-18233',
    title: 'Batman: The Long Halloween',
    type: 'comic',
    scope: 'saga',
    coverUrl: 'https://comicvine.gamespot.com/cover.jpg',
    releaseYear: 1996,
    publisher: 'DC Comics',
    creators: ['Jeph Loeb', 'Tim Sale'],
    issueCount: 13,
  },
];

describe('Hook useComicSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não dispara busca de query se tiver menos de 2 caracteres e carrega populares', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockComics }),
    } as Response);

    const { result } = renderHook(() => useComicSearch(''));

    await waitFor(() => {
      expect(result.current.popularComics).toHaveLength(1);
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('busca quadrinhos e mangás com debounce após 400ms para query válida', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }), // popular
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockComics }), // search
      } as Response);

    const { result } = renderHook(() => useComicSearch('Batman'));

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(result.current.results[0].title).toBe('Batman: The Long Halloween');
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/comics/search?q=Batman'));
  });

  it('preenche o estado de erro quando a API falha', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }), // popular
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Não foi possível realizar a busca de quadrinhos.' }),
      } as unknown as Response);

    const { result } = renderHook(() => useComicSearch('Berserk'));

    await waitFor(() => {
      expect(result.current.error).toBe('Não foi possível realizar a busca de quadrinhos.');
    });
  });
});
