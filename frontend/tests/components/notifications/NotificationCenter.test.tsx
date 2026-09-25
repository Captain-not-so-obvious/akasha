import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NotificationCenter } from '../../../src/components/notifications/NotificationCenter';
import type { NotificationItem } from '../../../src/types/notification';

const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    userId: 'user-1',
    type: 'FRIEND_RATED',
    title: 'cinefilo_mor avaliou Clube da Luta',
    message: 'Atribuiu 5 estrelas à obra.',
    data: {
      tmdbId: 550,
      mediaType: 'movie',
      posterPath: '/clube.jpg',
      userRating: 5,
      actionUrl: '/library?tmdbId=550&type=movie',
    },
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    userId: 'user-1',
    type: 'NEW_EPISODE',
    title: 'Novo episódio de Succession',
    message: 'T04E03 disponível agora!',
    data: {
      tmdbId: 76331,
      mediaType: 'tv',
      actionUrl: '/library?tmdbId=76331&type=tv',
    },
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

describe('NotificationCenter Component', () => {
  const mockOnClose = vi.fn();
  const mockOnMarkAsRead = vi.fn().mockResolvedValue(undefined);
  const mockOnMarkAllAsRead = vi.fn().mockResolvedValue(undefined);
  const mockOnCheckEpisodes = vi.fn().mockResolvedValue(0);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <BrowserRouter>
        <NotificationCenter
          isOpen={true}
          onClose={mockOnClose}
          notifications={mockNotifications}
          unreadCount={1}
          isLoading={false}
          onMarkAsRead={mockOnMarkAsRead}
          onMarkAllAsRead={mockOnMarkAllAsRead}
          onCheckEpisodes={mockOnCheckEpisodes}
          {...props}
        />
      </BrowserRouter>
    );
  };

  it('deve renderizar a central de notificações quando isOpen for true', () => {
    renderComponent();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Notificações')).toBeInTheDocument();
    expect(screen.getByText('1 não lida')).toBeInTheDocument();
    expect(screen.getByText('cinefilo_mor avaliou Clube da Luta')).toBeInTheDocument();
    expect(screen.getByText('Novo episódio de Succession')).toBeInTheDocument();
  });

  it('não deve renderizar nada quando isOpen for false', () => {
    renderComponent({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve chamar onMarkAllAsRead ao clicar no botão de marcar todas como lidas', () => {
    renderComponent();

    const markAllButton = screen.getByLabelText('Marcar todas como lidas');
    expect(markAllButton).toBeInTheDocument();

    fireEvent.click(markAllButton);
    expect(mockOnMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onMarkAsRead ao clicar em uma notificação não lida', async () => {
    renderComponent();

    const unreadCard = screen.getByText('cinefilo_mor avaliou Clube da Luta').closest('[role="button"]');
    expect(unreadCard).toBeInTheDocument();

    if (unreadCard) {
      await act(async () => {
        fireEvent.click(unreadCard);
      });
      expect(mockOnMarkAsRead).toHaveBeenCalledWith(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('deve fechar o painel ao pressionar a tecla Escape', () => {
    renderComponent();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onCheckEpisodes ao clicar no botão de atualizar', () => {
    renderComponent();

    const refreshButton = screen.getByLabelText('Verificar novos episódios');
    fireEvent.click(refreshButton);
    expect(mockOnCheckEpisodes).toHaveBeenCalledTimes(1);
  });

  it('deve exibir mensagem de estado vazio quando não houver notificações', () => {
    renderComponent({ notifications: [], unreadCount: 0 });

    expect(screen.getByText('Nenhuma pendente')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma notificação por aqui.')).toBeInTheDocument();
  });
});
