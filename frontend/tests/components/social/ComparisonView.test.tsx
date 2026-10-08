import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComparisonView } from '../../../src/components/social/ComparisonView';
import * as useFriendComparisonModule from '../../../src/hooks/useFriendComparison';

vi.mock('../../../src/hooks/useFriendComparison', () => ({
  useFriendComparison: vi.fn(),
}));

describe('Componente ComparisonView (SPEC-006 v2.0.0 Multidomínio & TV D-Pad)', () => {
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
    domainAffinities: {
      game: {
        percentage: 95,
        label: 'Almas Cósmicas' as const,
        totalShared: 5,
        totalOverlapRated: 3,
      },
      book: {
        percentage: 85,
        label: 'Frequência Harmônica' as const,
        totalShared: 3,
        totalOverlapRated: 2,
      },
      movie: {
        percentage: 80,
        label: 'Frequência Harmônica' as const,
        totalShared: 4,
        totalOverlapRated: 1,
      },
    },
    watchTogether: [
      {
        domain: 'movie' as const,
        externalId: '101',
        tmdbId: 101,
        mediaType: 'movie' as const,
        title: 'Interestelar',
        coverUrl: '/poster1.jpg',
        releaseYear: 2014,
      },
      {
        domain: 'game' as const,
        externalId: '1942',
        title: 'The Witcher 3: Wild Hunt',
        coverUrl: '/witcher.jpg',
        releaseYear: 2015,
      },
    ],
    ratedOverlap: [
      {
        domain: 'movie' as const,
        externalId: '202',
        tmdbId: 202,
        mediaType: 'movie' as const,
        title: 'A Origem',
        coverUrl: '/poster2.jpg',
        releaseYear: 2010,
        myRating: 5,
        friendRating: 5,
        myReview: 'Obra prima',
        friendReview: 'Filme excelente',
        delta: 0,
      },
      {
        domain: 'book' as const,
        externalId: 'dune-isbn',
        title: 'Duna',
        coverUrl: '/duna.jpg',
        releaseYear: 1965,
        myRating: 5,
        friendRating: 4,
        myReview: 'Ficção científica grandiosa',
        friendReview: 'Rico em detalhes',
        delta: 1,
      },
    ],
    friendRecommendations: [
      {
        domain: 'comic' as const,
        externalId: 'berserk-id',
        title: 'Berserk',
        coverUrl: '/berserk.jpg',
        releaseYear: 1989,
        friendRating: 5,
        friendReview: 'Obra-prima dos mangás',
        inMyBacklog: false,
      },
      {
        domain: 'tv' as const,
        externalId: '303',
        tmdbId: 303,
        mediaType: 'tv' as const,
        title: 'Dark',
        coverUrl: '/poster3.jpg',
        releaseYear: 2017,
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
      screen.getByText(/Consultando os Registros Akáshicos e alinhando acervos/i)
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

  it('deve renderizar o score de afinidade e obras de múltiplos módulos com tabIndex={0}', () => {
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

    // Afinidade Universal
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('Frequência Harmônica')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // totalShared

    // Breakdown de afinidade de módulos
    expect(screen.getAllByText('Jogos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('95%')).toBeInTheDocument();

    // Aba inicial: Curtir Juntos (Filme + Jogo)
    expect(screen.getByText('Interestelar')).toBeInTheDocument();
    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();
    expect(screen.getByText('Jogo')).toBeInTheDocument();
    expect(screen.getByText('Filme')).toBeInTheDocument();

    // Verificação de acessibilidade TV (tabIndex={0})
    const backBtn = screen.getByRole('button', { name: /Voltar para a lista de amigos/i });
    expect(backBtn).toHaveAttribute('tabindex', '0');

    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('deve filtrar as obras quando o usuário clica no filtro de módulo (ex: Jogos)', () => {
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

    // Inicialmente mostra ambos
    expect(screen.getByText('Interestelar')).toBeInTheDocument();
    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();

    // Clica no filtro "Jogos"
    const gamesFilterBtn = screen.getByRole('button', { name: /^Jogos$/i });
    fireEvent.click(gamesFilterBtn);

    // Agora apenas The Witcher 3 deve estar visível
    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();
    expect(screen.queryByText('Interestelar')).not.toBeInTheDocument();
  });

  it('deve alternar para a aba Consenso & Duelo e exibir notas de filmes e livros', () => {
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
    expect(screen.getByText('Duna')).toBeInTheDocument();
    expect(screen.getByText('Livro (1965)')).toBeInTheDocument();
    expect(screen.getByText('"Ficção científica grandiosa"')).toBeInTheDocument();
    expect(screen.getByText('"Rico em detalhes"')).toBeInTheDocument();
  });

  it('deve alternar para a aba Recomendações e permitir adicionar quadrinho com + Quero Ler', async () => {
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

    expect(screen.getByText('Berserk')).toBeInTheDocument();
    expect(screen.getByText('HQ/Mangá')).toBeInTheDocument();
    expect(screen.getByText('"Obra-prima dos mangás"')).toBeInTheDocument();

    // O botão contextual para quadrinho deve ser "Quero Ler"
    const addComicBtn = screen.getByRole('button', { name: /Quero Ler/i });
    expect(addComicBtn).toHaveAttribute('tabindex', '0');

    fireEvent.click(addComicBtn);
    expect(mockAddToBacklog).toHaveBeenCalledWith(mockComparisonData.friendRecommendations[0]);
  });
});
