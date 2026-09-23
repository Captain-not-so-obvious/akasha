import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProfile } from '../../src/hooks/useProfile';
import * as apiModule from '../../src/lib/api';

vi.mock('../../src/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('Hook useProfile (SPEC-002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar dados do perfil do usuário', async () => {
    const mockProfile = {
      id: 'user-1',
      email: 'viajante@akasha.com',
      username: 'viajante',
      avatarUrl: null,
      friendCode: 'AK-48B1-92A3',
      totalMedia: 20,
      totalFriends: 3,
    };

    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await result.current.fetchProfile();
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.isLoading).toBe(false);
  });

  it('deve atualizar username com sucesso', async () => {
    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        profile: { username: 'novo_viajante' },
      }),
    } as Response);

    const { result } = renderHook(() => useProfile());

    let res: { success: boolean; message: string };
    await act(async () => {
      res = await result.current.updateUsername('novo_viajante');
    });

    expect(res!.success).toBe(true);
    expect(res!.message).toContain('atualizado com sucesso');
  });

  it('deve atualizar avatarUrl com sucesso', async () => {
    vi.mocked(apiModule.apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        profile: { avatarUrl: 'https://exemplo.com/avatar.jpg' },
      }),
    } as Response);

    const { result } = renderHook(() => useProfile());

    let res: { success: boolean; message: string };
    await act(async () => {
      res = await result.current.updateAvatar('https://exemplo.com/avatar.jpg');
    });

    expect(res!.success).toBe(true);
    expect(res!.message).toContain('atualizada com sucesso');
  });
});
