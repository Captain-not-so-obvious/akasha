import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBookSearch } from '../../src/hooks/useBookSearch';
import { apiFetch } from '../../src/lib/api';
import type { BookDetails } from '../../src/types/book';

vi.mock('../../src/lib/api', () => ({
  apiFetch: vi.fn(),
}));

const mockBooks: BookDetails[] = [
  {
    id: 'vol-dom-casmurro',
    title: 'Dom Casmurro',
    authors: ['Machado de Assis'],
    coverUrl: 'https://books.google.com/cover.jpg',
    releaseYear: 1899,
    categories: ['Classics'],
  },
];

describe('Hook useBookSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não dispara busca se a query tiver menos de 2 caracteres', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    const { result } = renderHook(() => useBookSearch('a'));

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('busca livros com debounce após 400ms para query válida', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }), // popular
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockBooks }), // search
      } as Response);

    const { result } = renderHook(() => useBookSearch('Machado'));

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(result.current.results[0].title).toBe('Dom Casmurro');
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/books/search?q=Machado'));
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
        json: async () => ({ error: 'Falha no Google Books' }),
      } as Response);

    const { result } = renderHook(() => useBookSearch('Duna'));

    await waitFor(() => {
      expect(result.current.error).toBe('Falha no Google Books');
    });

    expect(result.current.results).toEqual([]);
  });
});
