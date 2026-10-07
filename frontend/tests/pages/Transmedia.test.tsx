import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransmediaPage } from '../../src/pages/Transmedia';
import * as useTransmediaModule from '../../src/hooks/useTransmedia';
import * as useWishlistModule from '../../src/hooks/useWishlist';
import { apiFetch } from '../../src/lib/api';

vi.mock('../../src/hooks/useTransmedia', () => ({
  useTransmedia: vi.fn(),
}));

vi.mock('../../src/hooks/useWishlist', () => ({
  useWishlist: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('TransmediaPage Component', () => {
  const mockFetchFranchises = vi.fn();
  const mockAddToList = vi.fn();
  const mockFetchWishlist = vi.fn();
  const mockUpdateListItem = vi.fn();
  const mockRemoveFromList = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 268,
        title: 'Batman',
        overview: 'Em Gotham City o milionário Bruce Wayne...',
        posterUrl: 'https://image.tmdb.org/t/p/w500/batman.jpg',
        backdropUrl: null,
        releaseDate: '1989-06-23',
        mediaType: 'movie',
        voteAverage: 7.2,
      }),
    } as Response);

    vi.mocked(useWishlistModule.useWishlist).mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      fetchWishlist: mockFetchWishlist,
      addToList: mockAddToList,
      updateListItem: mockUpdateListItem,
      removeFromList: mockRemoveFromList,
    });

    vi.mocked(useTransmediaModule.useTransmedia).mockReturnValue({
      recommendations: [],
      stats: {
        totalItems: 10,
        domainBreakdown: {
          movie: { count: 2, percentage: 20, averageRating: 4.5 },
          tv: { count: 2, percentage: 20, averageRating: 4.0 },
          game: { count: 2, percentage: 20, averageRating: 5.0 },
          book: { count: 2, percentage: 20, averageRating: 4.0 },
          comic: { count: 2, percentage: 20, averageRating: 4.5 },
        },
        statusBreakdown: {
          plan_to_watch: { count: 4, percentage: 40 },
          watching: { count: 2, percentage: 20 },
          completed: { count: 4, percentage: 40 },
          dropped: { count: 0, percentage: 0 },
        },
        ratingStats: { average: 4.4, ratedCount: 8, distribution: {} },
        consumptionMetrics: {
          estimatedScreenHours: 20,
          estimatedGameHours: 70,
          estimatedPagesRead: 600,
          totalComicVolumes: 2,
        },
        franchiseStats: { totalFranchises: 1, topFranchises: [] },
        diversityIndex: {
          score: 85,
          archetypeTitle: 'Polímata Transmídia',
          archetypeDescription: 'Você transcende os limites.',
        },
      },
      franchises: [
        {
          id: 'witcher',
          name: 'The Witcher',
          mediaCount: 3,
          availableDomains: ['game' as const, 'book' as const, 'tv' as const],
          medias: [
            {
              externalId: '1942',
              domain: 'game' as const,
              title: 'The Witcher 3',
              releaseYear: 2015,
              coverUrl: null,
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
      fetchRecommendations: vi.fn(),
      fetchStats: vi.fn(),
      fetchFranchises: mockFetchFranchises,
    });
  });

  it('deve renderizar o título da página e as abas principais', () => {
    render(<TransmediaPage />);

    expect(screen.getByText('O Grande Acervo')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Métricas/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Conexões/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Universos/i })).toBeInTheDocument();
  });

  it('deve alternar para a aba "Conexões" e exibir a seção explicativa', () => {
    render(<TransmediaPage />);

    const connectionsTab = screen.getByRole('tab', { name: /Conexões/i });
    fireEvent.click(connectionsTab);

    expect(screen.getByText(/Como Funciona o Motor Transmídia do Akasha\?/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Detecção de IP/i)).toBeInTheDocument();
  });

  it('deve alternar para a aba "Universos" e listar as franquias canônicas', () => {
    render(<TransmediaPage />);

    const universesTab = screen.getByRole('tab', { name: /Universos/i });
    fireEvent.click(universesTab);

    expect(screen.getByText('Catálogo de Universos Transmídia Canônicos')).toBeInTheDocument();
    expect(screen.getByText('The Witcher')).toBeInTheDocument();
    expect(screen.getByText('The Witcher 3')).toBeInTheDocument();
  });

  it('deve abrir a modal com o título da recomendação e proteger contra divergência caso a API externa retorne item diferente', async () => {
    const mockRec = {
      franchiseName: 'Batman',
      sourceItem: {
        externalId: 'cv-4050-3944',
        domain: 'comic' as const,
        title: 'Batman: The Dark Knight Returns',
      },
      targetItem: {
        externalId: '501',
        domain: 'game' as const,
        title: 'Batman: Arkham City',
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1voh.jpg',
        releaseYear: 2011,
        overview: 'Visão definitiva do combate do Homem-Morcego.',
      },
      reason: 'Porque você avaliou com 5 estrelas',
      score: 99,
      isColdStart: false,
    };

    vi.mocked(useTransmediaModule.useTransmedia).mockReturnValue({
      recommendations: [mockRec],
      stats: null,
      franchises: [],
      isLoading: false,
      error: null,
      fetchRecommendations: vi.fn(),
      fetchStats: vi.fn(),
      fetchFranchises: mockFetchFranchises,
    });

    render(<TransmediaPage />);

    const cardButton = screen.getByText('Batman: Arkham City');
    expect(cardButton).toBeInTheDocument();

    fireEvent.click(cardButton);

    // Deve abrir o GameDetailsModal com Batman: Arkham City
    const modalHeadings = await screen.findAllByText(/Batman: Arkham City/i);
    expect(modalHeadings.length).toBeGreaterThan(0);
    // Não deve conter títulos espúrios de outros jogos
    expect(screen.queryByText(/Simon the Sorcerer/i)).not.toBeInTheDocument();
  });

  it('ao clicar em "Já Assisti" em uma recomendação de filme no Grande Acervo, abre o RatingModal e salva com nota e resenha', async () => {
    const mockMovieRec = {
      franchiseName: 'Batman',
      sourceItem: {
        externalId: '501',
        domain: 'game' as const,
        title: 'Batman: Arkham City',
      },
      targetItem: {
        externalId: '268',
        domain: 'movie' as const,
        mediaType: 'movie' as const,
        title: 'Batman',
        coverUrl: 'https://image.tmdb.org/t/p/w500/batman.jpg',
        releaseYear: 1989,
        overview: 'Em Gotham City o milionário Bruce Wayne...',
      },
      reason: 'Porque você jogou Batman: Arkham City',
      score: 95,
      isColdStart: false,
    };

    vi.mocked(useTransmediaModule.useTransmedia).mockReturnValue({
      recommendations: [mockMovieRec],
      stats: null,
      franchises: [],
      isLoading: false,
      error: null,
      fetchRecommendations: vi.fn(),
      fetchStats: vi.fn(),
      fetchFranchises: mockFetchFranchises,
    });

    render(<TransmediaPage />);

    // Clica no card de Batman
    const cardButton = screen.getByRole('button', { name: /Recomendação Transmídia: Batman/i });
    fireEvent.click(cardButton);

    // Aguarda o modal de detalhes abrir com o botão "Já Assisti"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /já assisti/i })).toBeInTheDocument();
    });

    // Clica em "Já Assisti"
    fireEvent.click(screen.getByRole('button', { name: /já assisti/i }));

    // Deve abrir o RatingModal para avaliar a obra
    await waitFor(() => {
      expect(screen.getByText('Quer deixar uma opinião?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /salvar avaliação/i })).toBeInTheDocument();
    });

    // Seleciona 5 estrelas
    const star5 = screen.getByRole('button', { name: /5 estrelas/i });
    fireEvent.click(star5);

    // Digita resenha
    const reviewInput = screen.getByPlaceholderText(/o que você achou dessa obra\?/i);
    fireEvent.change(reviewInput, {
      target: { value: 'Filme lendário de 1989 do Tim Burton!' },
    });

    // Salva avaliação
    const saveBtn = screen.getByRole('button', { name: /salvar avaliação/i });
    fireEvent.click(saveBtn);

    expect(mockAddToList).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdbId: 268,
        mediaType: 'movie',
        status: 'completed',
        userRating: 5,
        notes: 'Filme lendário de 1989 do Tim Burton!',
        title: 'Batman',
      })
    );
  });

  it('ao clicar em "Quero Ver", adiciona a obra recomendada diretamente com status plan_to_watch', async () => {
    const mockMovieRec = {
      franchiseName: 'Batman',
      sourceItem: {
        externalId: '501',
        domain: 'game' as const,
        title: 'Batman: Arkham City',
      },
      targetItem: {
        externalId: '268',
        domain: 'movie' as const,
        mediaType: 'movie' as const,
        title: 'Batman',
        coverUrl: 'https://image.tmdb.org/t/p/w500/batman.jpg',
        releaseYear: 1989,
        overview: 'Em Gotham City...',
      },
      reason: 'Conexão transmídia',
      score: 90,
      isColdStart: false,
    };

    vi.mocked(useTransmediaModule.useTransmedia).mockReturnValue({
      recommendations: [mockMovieRec],
      stats: null,
      franchises: [],
      isLoading: false,
      error: null,
      fetchRecommendations: vi.fn(),
      fetchStats: vi.fn(),
      fetchFranchises: mockFetchFranchises,
    });

    render(<TransmediaPage />);

    fireEvent.click(screen.getByRole('button', { name: /Recomendação Transmídia: Batman/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar à biblioteca|quero ver/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /adicionar à biblioteca|quero ver/i }));

    expect(mockAddToList).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdbId: 268,
        mediaType: 'movie',
        status: 'plan_to_watch',
        title: 'Batman',
      })
    );
  });

  it('ao clicar em "Começar a Assistir", adiciona a obra com status watching', async () => {
    const mockMovieRec = {
      franchiseName: 'Batman',
      sourceItem: {
        externalId: '501',
        domain: 'game' as const,
        title: 'Batman: Arkham City',
      },
      targetItem: {
        externalId: '268',
        domain: 'movie' as const,
        mediaType: 'movie' as const,
        title: 'Batman',
        coverUrl: 'https://image.tmdb.org/t/p/w500/batman.jpg',
        releaseYear: 1989,
        overview: 'Em Gotham City...',
      },
      reason: 'Conexão transmídia',
      score: 90,
      isColdStart: false,
    };

    vi.mocked(useTransmediaModule.useTransmedia).mockReturnValue({
      recommendations: [mockMovieRec],
      stats: null,
      franchises: [],
      isLoading: false,
      error: null,
      fetchRecommendations: vi.fn(),
      fetchStats: vi.fn(),
      fetchFranchises: mockFetchFranchises,
    });

    render(<TransmediaPage />);

    fireEvent.click(screen.getByRole('button', { name: /Recomendação Transmídia: Batman/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /começar a assistir/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /começar a assistir/i }));

    expect(mockAddToList).toHaveBeenCalledWith(
      expect.objectContaining({
        tmdbId: 268,
        mediaType: 'movie',
        status: 'watching',
        title: 'Batman',
      })
    );
  });

  it('quando o item sugerido já está na biblioteca, exibe indicação e opções de gerenciamento', async () => {
    const mockMovieRec = {
      franchiseName: 'Batman',
      sourceItem: {
        externalId: '501',
        domain: 'game' as const,
        title: 'Batman: Arkham City',
      },
      targetItem: {
        externalId: '268',
        domain: 'movie' as const,
        mediaType: 'movie' as const,
        title: 'Batman',
        coverUrl: 'https://image.tmdb.org/t/p/w500/batman.jpg',
        releaseYear: 1989,
        overview: 'Em Gotham City...',
      },
      reason: 'Conexão transmídia',
      score: 90,
      isColdStart: false,
    };

    vi.mocked(useTransmediaModule.useTransmedia).mockReturnValue({
      recommendations: [mockMovieRec],
      stats: null,
      franchises: [],
      isLoading: false,
      error: null,
      fetchRecommendations: vi.fn(),
      fetchStats: vi.fn(),
      fetchFranchises: mockFetchFranchises,
    });

    vi.mocked(useWishlistModule.useWishlist).mockReturnValue({
      items: [
        {
          id: 42,
          userId: 'user-1',
          domain: 'movie',
          externalId: '268',
          tmdbId: 268,
          mediaType: 'movie',
          title: 'Batman',
          status: 'plan_to_watch',
          userRating: null,
          notes: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      isLoading: false,
      error: null,
      fetchWishlist: mockFetchWishlist,
      addToList: mockAddToList,
      updateListItem: mockUpdateListItem,
      removeFromList: mockRemoveFromList,
    });

    render(<TransmediaPage />);

    fireEvent.click(screen.getByRole('button', { name: /Recomendação Transmídia: Batman/i }));

    await waitFor(() => {
      expect(screen.getByText('Já está na sua Biblioteca')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remover/i })).toBeInTheDocument();
    });

    // Clica em remover
    fireEvent.click(screen.getByRole('button', { name: /remover/i }));
    expect(mockRemoveFromList).toHaveBeenCalledWith(42);
  });
});
