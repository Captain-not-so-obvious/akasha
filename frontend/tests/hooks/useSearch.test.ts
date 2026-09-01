import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useSearch } from '../../src/hooks/useSearch';

// Mock do utilitário de token para não depender do Supabase em testes
vi.mock('../../src/utils/auth', () => ({
  getAuthToken: vi.fn().mockResolvedValue('fake-jwt-token'),
}));

/**
 * Helper: dispara o debounce com fake timers e depois restaura timers reais
 * para que `waitFor` possa resolver Promises normalmente sem deadlock.
 */
function triggerDebounce(ms = 400) {
  vi.useFakeTimers();
  act(() => { vi.advanceTimersByTime(ms); });
  vi.useRealTimers();
}

describe('Hook useSearch', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('não dispara fetch se a query tiver menos de 2 caracteres', async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    renderHook(() => useSearch('a', 'movie'));

    triggerDebounce(500);

    // Aguarda um tick para garantir que nenhuma Promise assíncrona resolveu
    await Promise.resolve();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('dispara fetch com debounce após 400ms para query válida', async () => {
    const mockPayload = {
      results: [
        {
          id: 1,
          title: 'Batman',
          overview: 'Um homem morcego.',
          posterUrl: null,
          backdropUrl: null,
          releaseDate: '2022-03-04',
          mediaType: 'movie',
          voteAverage: 7.8,
        },
      ],
      totalResults: 1,
      totalPages: 1,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    } as unknown as Response);

    const { result } = renderHook(() => useSearch('batman', 'movie'));

    triggerDebounce(400);

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });

    expect(result.current.results[0].title).toBe('Batman');
    expect(result.current.totalResults).toBe(1);
    expect(result.current.isLoading).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/tmdb/search?q=batman&type=movie'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fake-jwt-token' }),
      })
    );
  });

  it('preenche o estado de erro quando o fetch falha com resposta não-ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Falha ao comunicar com o TMDB.' }),
    } as unknown as Response);

    const { result } = renderHook(() => useSearch('fail', 'tv'));

    triggerDebounce(400);

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error).toBe('Falha ao comunicar com o TMDB.');
    expect(result.current.results).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('cancela a requisição anterior ao mudar a query rapidamente (debounce)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], totalResults: 0, totalPages: 0 }),
    } as unknown as Response);

    globalThis.fetch = mockFetch;

    vi.useFakeTimers();

    const { rerender } = renderHook(
      ({ query }: { query: string }) => useSearch(query, 'movie'),
      { initialProps: { query: 'bat' } }
    );

    // Avança metade do debounce — ainda não deve ter disparado o fetch
    act(() => { vi.advanceTimersByTime(200); });

    // Muda a query antes do debounce completar (cancela o timer anterior)
    rerender({ query: 'batman' });

    // Dispara o debounce completo da nova query e restaura timers reais
    act(() => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Apenas 1 fetch deve ter ocorrido (para 'batman')
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('q=batman'),
      expect.anything()
    );
  });

  it('limpa os resultados e não emite erro quando a query está vazia', () => {
    const { result } = renderHook(
      ({ query }: { query: string }) => useSearch(query, 'movie'),
      { initialProps: { query: '' } }
    );

    expect(result.current.results).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
