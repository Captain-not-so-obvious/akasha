import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComparisonView } from '../../../src/components/social/ComparisonView';
import * as useFriendComparisonModule from '../../../src/hooks/useFriendComparison';

vi.mock('../../../src/hooks/useFriendComparison', () => ({
  useFriendComparison: vi.fn(),
}));

describe('Componente ComparisonView (SPEC-006 & TV D-Pad)', () => {
  const mockOnBack = vi.fn();
  const mockRefetch = vi.fn();
  const mockAddToBacklog = vi.fn();

  const mockComparisonData = {
    friend: {
      id: 'friend-123',
      username: 'viajante_parceiro',
      avatarUrl: null,
      friendCode: 'AK-9999-0000',
    },
    affinity: {
      percentage: 88,
      label: 'Frequência Harmônica' as const,
      totalShared: 12,
      totalOverlapRated: 6,
    },
    watchTogether: [
      {
        tmdbId: 101,
        mediaType: 'movie' as const,
        title: 'Interestelar',
        posterUrl: '/poster1.jpg',
      },
    ],
    ratedOverlap: [
      {
        tmdbId: 202,
        mediaType: 'movie' as const,
        title: 'A Origem',
        posterUrl: '/poster2.jpg',
        myRating: 5,
        friendRating: 5,
        myReview: 'Obra prima',
        friendReview: 'Filme excelente',
        delta: 0,
      },
    ],
    friendRecommendations: [
      {
        tmdbId: 303,
        mediaType: 'tv' as const,
        title: 'Dark',
        posterUrl: '/poster3.jpg',
        friendRating: 5,
        friendReview: 'Mente explodida',
        inMyBacklog: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o estado de carregamento', () => {
    vi.mocked(useFriendComparisonModule.useFriendComparison).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      actionFeedback: null,
      refetch: mockRefetch,
      addToBacklog: mockAddToBacklog,
    });

    render(
      <ComparisonView
        friendId="friend-123"
        friendName="viajante_parceiro"
        onBack={mockOnBack}
      />
    );

    expect(
      screen.getByText(/Consultando os Registros Akáshicos e alinhando acervos.../i)
    ).toBeInTheDocument();
  });

  it('deve renderizar estado de erro com botão de voltar e tentar novamente', () => {
    vi.mocked(useFriendComparisonModule.useFriendComparison).mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Você só pode sincronizar acervos com amigos confirmados.',
      actionFeedback: null,
      refetch: mockRefetch,
      addToBacklog: mockAddToBacklog,
    });

    render(
      <ComparisonView
        friendId="friend-123"
        friendName="viajante_parceiro"
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Falha na Sincronia Cósmica')).toBeInTheDocument();
    expect(
      screen.getByText('Você só pode sincronizar acervos com amigos confirmados.')
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    const backBtn = screen.getByRole('button', { name: /Voltar/i });
    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar o score de afinidade e dados da aba Para Ver Juntos com tabIndex={0}', () => {
    vi.mocked(useFriendComparisonModule.useFriendComparison).mockReturnValue({
      data: mockComparisonData,
      isLoading: false,
      error: null,
      actionFeedback: null,
      refetch: mockRefetch,
      addToBacklog: mockAddToBacklog,
    });

    render(
      <ComparisonView
        friendId="friend-123"
        friendName="viajante_parceiro"
        onBack={mockOnBack}
      />
    );

    // Afinidade
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('Frequência Harmônica')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // totalShared

    // Aba inicial: Para Ver Juntos
    expect(screen.getByText('Interestelar')).toBeInTheDocument();
    expect(screen.getByText('🍿 Na lista de ambos')).toBeInTheDocument();

    // Verificação de acessibilidade TV (tabIndex={0})
    const backBtn = screen.getByRole('button', { name: /Voltar para a lista de amigos/i });
    expect(backBtn).toHaveAttribute('tabindex', '0');

    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('deve alternar para a aba Consenso & Duelo e exibir notas comparadas', () => {
    vi.mocked(useFriendComparisonModule.useFriendComparison).mockReturnValue({
      data: mockComparisonData,
      isLoading: false,
      error: null,
      actionFeedback: null,
      refetch: mockRefetch,
      addToBacklog: mockAddToBacklog,
    });

    render(
      <ComparisonView
        friendId="friend-123"
        friendName="viajante_parceiro"
        onBack={mockOnBack}
      />
    );

    const consensusTabBtn = screen.getByRole('button', { name: /Consenso & Duelo/i });
    fireEvent.click(consensusTabBtn);

    expect(screen.getByText('A Origem')).toBeInTheDocument();
    expect(screen.getAllByText(/Consenso/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('"Obra prima"')).toBeInTheDocument();
    expect(screen.getByText('"Filme excelente"')).toBeInTheDocument();
  });

  it('deve alternar para a aba Recomendações e permitir adicionar à lista com + Quero Ver', async () => {
    vi.mocked(useFriendComparisonModule.useFriendComparison).mockReturnValue({
      data: mockComparisonData,
      isLoading: false,
      error: null,
      actionFeedback: null,
      refetch: mockRefetch,
      addToBacklog: mockAddToBacklog,
    });

    render(
      <ComparisonView
        friendId="friend-123"
        friendName="viajante_parceiro"
        onBack={mockOnBack}
      />
    );

    const recommendationsTabBtn = screen.getByRole('button', {
      name: /Recomendações de viajante_parceiro/i,
    });
    fireEvent.click(recommendationsTabBtn);

    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('"Mente explodida"')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /Quero Ver/i });
    expect(addBtn).toHaveAttribute('tabindex', '0');

    fireEvent.click(addBtn);
    expect(mockAddToBacklog).toHaveBeenCalledWith(mockComparisonData.friendRecommendations[0]);
  });
});
