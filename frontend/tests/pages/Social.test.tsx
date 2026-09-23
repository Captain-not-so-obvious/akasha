import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Social } from '../../src/pages/Social';
import * as useSocialModule from '../../src/hooks/useSocial';
import * as useProfileModule from '../../src/hooks/useProfile';

vi.mock('../../src/hooks/useSocial', () => ({
  useSocial: vi.fn(),
}));

vi.mock('../../src/hooks/useProfile', () => ({
  useProfile: vi.fn(),
}));

describe('Página Social (Camada de Amizade & TV D-Pad - SPEC-002)', () => {
  const mockSendFriendRequest = vi.fn();
  const mockRespondRequest = vi.fn();
  const mockRemoveFriend = vi.fn();
  const mockBlockUser = vi.fn();
  const mockUnblockUser = vi.fn();
  const mockRegenerateFriendCode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useProfileModule.useProfile).mockReturnValue({
      profile: {
        id: 'user-1',
        email: 'viajante@akasha.com',
        username: 'viajante_mestre',
        avatarUrl: null,
        friendCode: 'AK-48B1-92A3',
        totalMedia: 25,
        totalFriends: 2,
      },
      isLoading: false,
      error: null,
      fetchProfile: vi.fn(),
      updateUsername: vi.fn(),
      setFriendCodeLocally: vi.fn(),
    });

    vi.mocked(useSocialModule.useSocial).mockReturnValue({
      friends: [
        {
          friendshipId: 1,
          id: 'friend-1',
          username: 'cinefilo_neo',
          avatarUrl: null,
          friendCode: 'AK-7777-8888',
          totalMedia: 42,
          friendsSince: '2026-09-23T10:00:00Z',
        },
      ],
      requests: {
        received: [
          {
            id: 10,
            createdAt: '2026-09-23T11:00:00Z',
            user: {
              id: 'req-user-1',
              username: 'amigo_pendente',
              avatarUrl: null,
              friendCode: 'AK-9999-0000',
              totalMedia: 12,
            },
          },
        ],
        sent: [],
      },
      blockedUsers: [
        {
          friendshipId: 99,
          id: 'blocked-1',
          username: 'usuario_chato',
          avatarUrl: null,
          friendCode: 'AK-3333-4444',
          blockedAt: '2026-09-23T11:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
      fetchSocialData: vi.fn(),
      sendFriendRequest: mockSendFriendRequest,
      respondRequest: mockRespondRequest,
      removeFriend: mockRemoveFriend,
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
      regenerateFriendCode: mockRegenerateFriendCode,
    });
  });

  it('deve renderizar o título do Círculo Akasha e o Friend Code com acessibilidade para TV', () => {
    render(<Social />);

    expect(screen.getByText('Círculo Akasha')).toBeInTheDocument();
    expect(screen.getByText('AK-48B1-92A3')).toBeInTheDocument();
    
    // Verifica elementos interativos com tabIndex=0 para navegação D-Pad
    const connectBtn = screen.getByRole('button', { name: /Conectar/i });
    expect(connectBtn).toHaveAttribute('tabIndex', '0');
  });

  it('deve listar amigos confirmados com quantidade de mídias no acervo', () => {
    render(<Social />);

    expect(screen.getByText('cinefilo_neo')).toBeInTheDocument();
    expect(screen.getByText(/42 mídias/i)).toBeInTheDocument();
  });

  it('deve disparar envio de solicitação ao submeter o formulário', async () => {
    mockSendFriendRequest.mockResolvedValueOnce({
      success: true,
      message: 'Solicitação de amizade enviada com sucesso!',
    });

    render(<Social />);

    const input = screen.getByPlaceholderText(/Digite e-mail, @username ou Friend Code/i);
    fireEvent.change(input, { target: { value: 'colega@akasha.com' } });

    const submitBtn = screen.getByRole('button', { name: /Conectar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSendFriendRequest).toHaveBeenCalledWith('colega@akasha.com');
      expect(screen.getByText(/Solicitação de amizade enviada com sucesso!/i)).toBeInTheDocument();
    });
  });

  it('deve permitir navegar para a aba de Solicitações Recebidas e aceitar convite', async () => {
    mockRespondRequest.mockResolvedValueOnce({
      success: true,
      message: 'Amizade confirmada!',
    });

    render(<Social />);

    const receivedTab = screen.getByRole('button', { name: /Solicitações Recebidas/i });
    fireEvent.click(receivedTab);

    expect(screen.getByText('amigo_pendente')).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: /Aceitar/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(mockRespondRequest).toHaveBeenCalledWith(10, 'accept');
    });
  });

  it('deve permitir bloquear um usuário a partir de uma solicitação recebida', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockRespondRequest.mockResolvedValueOnce({
      success: true,
      message: 'Usuário bloqueado.',
    });

    render(<Social />);

    const receivedTab = screen.getByRole('button', { name: /Solicitações Recebidas/i });
    fireEvent.click(receivedTab);

    const blockBtn = screen.getByRole('button', { name: /Bloquear/i });
    fireEvent.click(blockBtn);

    await waitFor(() => {
      expect(mockRespondRequest).toHaveBeenCalledWith(10, 'block');
    });
  });

  it('deve listar usuários na aba Bloqueados e permitir desbloqueio', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUnblockUser.mockResolvedValueOnce({
      success: true,
      message: 'Usuário desbloqueado com sucesso.',
    });

    render(<Social />);

    const blockedTab = screen.getByRole('button', { name: /Bloqueados/i });
    fireEvent.click(blockedTab);

    expect(screen.getByText('usuario_chato')).toBeInTheDocument();

    const unblockBtn = screen.getByRole('button', { name: /Desbloquear/i });
    fireEvent.click(unblockBtn);

    await waitFor(() => {
      expect(mockUnblockUser).toHaveBeenCalledWith('blocked-1');
    });
  });

  it('deve permitir desfazer amizade na aba de Amigos', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockRemoveFriend.mockResolvedValueOnce({
      success: true,
      message: 'Amizade desfeita.',
    });

    render(<Social />);

    const removeBtn = screen.getByRole('button', { name: /Desfazer amizade com cinefilo_neo/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mockRemoveFriend).toHaveBeenCalledWith('friend-1');
    });
  });

  it('deve permitir bloquear um amigo diretamente na aba de Amigos', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockBlockUser.mockResolvedValueOnce({
      success: true,
      message: 'Usuário bloqueado com sucesso.',
    });

    render(<Social />);

    const blockBtn = screen.getByRole('button', { name: /Bloquear cinefilo_neo/i });
    fireEvent.click(blockBtn);

    await waitFor(() => {
      expect(mockBlockUser).toHaveBeenCalledWith('friend-1');
    });
  });
});
