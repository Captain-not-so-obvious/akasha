import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Library } from '../../src/pages/Library';
import * as useWishlistModule from '../../src/hooks/useWishlist';
import * as useRecsModule from '../../src/hooks/useRecommendations';
import * as useGameRecsModule from '../../src/hooks/useGameRecommendations';
import * as apiModule from '../../src/lib/api';

vi.mock('../../src/hooks/useWishlist', () => ({
  useWishlist: vi.fn(),
}));

vi.mock('../../src/hooks/useRecommendations', () => ({
  useRecommendations: vi.fn(),
}));

vi.mock('../../src/hooks/useGameRecommendations', () => ({
  useGameRecommendations: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  apiFetch: vi.fn(),
}));

describe('Library Page', () => {
  const mockFetchWishlist = vi.fn();
  const mockUpdateListItem = vi.fn();
  const mockRemoveFromList = vi.fn();
  const mockAddToList = vi.fn();
  const mockFetchRecommendations = vi.fn();
  const mockFetchGameRecommendations = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiModule.apiFetch).mockResolvedValue({ ok: false } as Response);

    vi.mocked(useWishlistModule.useWishlist).mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      fetchWishlist: mockFetchWishlist,
      updateListItem: mockUpdateListItem,
      removeFromList: mockRemoveFromList,
      addToList: mockAddToList,
    });

    vi.mocked(useGameRecsModule.useGameRecommendations).mockReturnValue({
      recommendations: [],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchGameRecommendations,
    });

    vi.mocked(useRecsModule.useRecommendations).mockReturnValue({
      recommendations: [
        {
          tmdbId: 157336,
          title: 'Interstellar',
          overview: 'As viagens interestelares...',
          posterUrl: '/interstellar.jpg',
          backdropUrl: '/backdrop.jpg',
          releaseDate: '2014-11-05',
          mediaType: 'movie',
          voteAverage: 8.6,
          reason: 'Baseado na sua nota para Inception',
          score: 98,
          isColdStart: false,
        },
      ],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });
  });

  it('deve abrir o modal de detalhes ao clicar em um card do RecommendationRail', () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    );

    const card = screen.getByRole('button', { name: /Interstellar/i });
    expect(card).toBeInTheDocument();

    // Clica no card de recomendação
    fireEvent.click(card);

    // O modal deve ser exibido com os detalhes e o botão de adicionar à biblioteca
    expect(screen.getByRole('button', { name: /Adicionar à Biblioteca/i })).toBeInTheDocument();
  });

  it('deve chamar addToList ao clicar em Adicionar à Biblioteca no modal de recomendação', () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    );

    const card = screen.getByRole('button', { name: /Interstellar/i });
    fireEvent.click(card);

    const addButton = screen.getByRole('button', { name: /Adicionar à Biblioteca/i });
    fireEvent.click(addButton);

    expect(mockAddToList).toHaveBeenCalledWith({
      tmdbId: 157336,
      mediaType: 'movie',
      status: 'plan_to_watch',
    });
  });

  it('deve carregar e abrir detalhes de mídia automaticamente quando tmdbId e type forem passados na URL', async () => {
    const mockMediaDetails = {
      id: 1214931,
      mediaType: 'movie',
      title: 'Nuremberg',
      overview: 'Drama sobre o julgamento de Nuremberg...',
      posterUrl: '/nuremberg.jpg',
      backdropUrl: '/nuremberg_bg.jpg',
      releaseDate: '2025-01-01',
      voteAverage: 8.2,
      voteCount: 150,
      genres: ['História', 'Drama'],
      cast: [],
      directors: [],
    };

    vi.mocked(apiModule.apiFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMediaDetails,
    } as Response);

    render(
      <MemoryRouter initialEntries={['/library?tmdbId=1214931&type=movie']}>
        <Library />
      </MemoryRouter>
    );

    expect(apiModule.apiFetch).toHaveBeenCalledWith('/tmdb/movie/1214931');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Nuremberg/i })).toBeInTheDocument();
    });
  });

  it('deve alternar para a visão de Games e exibir abas contextuais Jogando, Quero Jogar e Concluídos', () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    );

    // Inicialmente em Cinema
    expect(screen.getByRole('button', { name: /Cinema & Séries/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assistindo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quero Ver/i })).toBeInTheDocument();

    // Clica no seletor de Jogos (Games)
    const gamesToggle = screen.getByRole('button', { name: /Jogos \(Games\)/i });
    fireEvent.click(gamesToggle);

    // Agora as abas devem mudar para o vocabulário de jogos
    expect(screen.getByRole('button', { name: /Jogando/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quero Jogar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Concluídos \(Zerados\)/i })).toBeInTheDocument();
  });

  it('deve renderizar o ThematicLoader com círculo giratório ao carregar o acervo da biblioteca', () => {
    vi.mocked(useWishlistModule.useWishlist).mockReturnValue({
      items: [],
      isLoading: true,
      error: null,
      fetchWishlist: mockFetchWishlist,
      updateListItem: mockUpdateListItem,
      removeFromList: mockRemoveFromList,
      addToList: mockAddToList,
    });

    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('spinning-circle')).toBeInTheDocument();
    expect(screen.getByText('Sincronizando seu acervo no Akasha')).toBeInTheDocument();
  });
});

