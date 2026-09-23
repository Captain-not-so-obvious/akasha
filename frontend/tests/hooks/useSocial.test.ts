import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSocial } from '../../src/hooks/useSocial';
import * as apiModule from '../../src/lib/api';

vi.mock('../../src/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('Hook useSocial (SPEC-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar amigos e solicitações ao montar', async () => {
    const mockFriends = [
      {
        friendshipId: 1,
        id: 'user-2',
        username: 'amigo1',
        avatarUrl: null,
        friendCode: 'AK-1111-2222',
        totalMedia: 10,
        friendsSince: '2026-09-23T10:00:00Z',
      },
    ];

    const mockRequests = {
      received: [],
      sent: [],
    };

    vi.mocked(apiModule.apiFetch).mockImplementation(async (endpoint) => {
      if (endpoint === '/friends') {
        return { ok: true, json: async () => mockFriends } as Response;
      }
      if (endpoint === '/friends/requests') {
        return { ok: true, json: async () => mockRequests } as Response;
      }
      return { ok: false } as Response;
    });

    const { result } = renderHook(() => useSocial());

    await act(async () => {
      await result.current.fetchSocialData();
    });

    expect(result.current.friends).toEqual(mockFriends);
    expect(result.current.requests).toEqual(mockRequests);
    expect(result.current.isLoading).toBe(false);
  });

  it('deve enviar solicitação de amizade com sucesso', async () => {
    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Solicitação de amizade enviada com sucesso!' }),
    } as Response);

    const { result } = renderHook(() => useSocial());

    let res: { success: boolean; message: string };
    await act(async () => {
      res = await result.current.sendFriendRequest('novo_amigo@akasha.com');
    });

    expect(res!.success).toBe(true);
    expect(res!.message).toContain('enviada com sucesso');
  });

  it('deve responder a uma solicitação pendente', async () => {
    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Amizade confirmada!' }),
    } as Response);

    const { result } = renderHook(() => useSocial());

    let res: { success: boolean; message: string };
    await act(async () => {
      res = await result.current.respondRequest(15, 'accept');
    });

    expect(res!.success).toBe(true);
    expect(res!.message).toBe('Amizade confirmada!');
  });

  it('deve bloquear um usuário diretamente com sucesso', async () => {
    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Usuário bloqueado com sucesso.' }),
    } as Response);

    const { result } = renderHook(() => useSocial());

    let res: { success: boolean; message: string };
    await act(async () => {
      res = await result.current.blockUser('target-user-id');
    });

    expect(res!.success).toBe(true);
    expect(res!.message).toBe('Usuário bloqueado com sucesso.');
  });

  it('deve desbloquear um usuário com sucesso', async () => {
    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Usuário desbloqueado com sucesso.' }),
    } as Response);

    const { result } = renderHook(() => useSocial());

    let res: { success: boolean; message: string };
    await act(async () => {
      res = await result.current.unblockUser('target-user-id');
    });

    expect(res!.success).toBe(true);
    expect(res!.message).toBe('Usuário desbloqueado com sucesso.');
  });
});
