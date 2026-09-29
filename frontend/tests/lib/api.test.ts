import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

describe('lib/api: apiFetch', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);
    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('NÃO deve injetar Content-Type: application/json em requisições sem body (ex: PATCH /notifications/read-all)', async () => {
    await apiFetch('/notifications/read-all', {
      method: 'PATCH',
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = init?.headers as Headers;

    expect(headers.get('Content-Type')).toBeNull();
    expect(init?.method).toBe('PATCH');
    expect(init?.credentials).toBe('include');
  });

  it('DEVE injetar Content-Type: application/json quando body é fornecido e não há Content-Type', async () => {
    await apiFetch('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ tmdbId: 123 }),
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = init?.headers as Headers;

    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('NÃO deve injetar Content-Type: application/json quando body é FormData', async () => {
    const formData = new FormData();
    formData.append('file', 'test');

    await apiFetch('/upload', {
      method: 'POST',
      body: formData,
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = init?.headers as Headers;

    expect(headers.get('Content-Type')).toBeNull();
  });

  it('DEVE preservar o Content-Type pré-definido pelo chamador', async () => {
    await apiFetch('/custom', {
      method: 'POST',
      body: 'custom-data',
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = init?.headers as Headers;

    expect(headers.get('Content-Type')).toBe('text/plain');
  });

  it('DEVE injetar cabeçalho Authorization quando existe sessão ativa no Supabase', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'fake-supabase-token',
        } as any,
      },
      error: null,
    });

    await apiFetch('/notifications/read-all', {
      method: 'PATCH',
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = init?.headers as Headers;

    expect(headers.get('Authorization')).toBe('Bearer fake-supabase-token');
  });

  it('DEVE respeitar URLs absolutas sem prefixar BACKEND_URL', async () => {
    await apiFetch('https://api.themoviedb.org/3/movie/550');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];

    expect(url).toBe('https://api.themoviedb.org/3/movie/550');
  });

  it('DEVE tentar renovar a sessão com refreshSession() e retentar a requisição quando o backend responder 401', async () => {
    // 1ª chamada retorna 401, 2ª chamada retorna 200
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Token expirado' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    vi.mocked(supabase.auth.refreshSession).mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'new-refreshed-token',
        } as any,
        user: null,
      },
      error: null,
    });

    const res = await apiFetch('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ externalId: '123' }),
    });

    expect(res.status).toBe(200);
    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    const [, secondInit] = vi.mocked(globalThis.fetch).mock.calls[1];
    const headers = secondInit?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer new-refreshed-token');
  });
});
