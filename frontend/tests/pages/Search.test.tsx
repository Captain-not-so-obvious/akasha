import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchPage } from '../../src/pages/Search';
import { useSearch } from '../../src/hooks/useSearch';
import { useGameSearch } from '../../src/hooks/useGameSearch';
import { useWishlist } from '../../src/hooks/useWishlist';
import type { MediaDetails } from '../../src/types/media';
import type { LibraryItem } from '../../src/types/wishlist';
import type { GameDetails } from '../../src/types/game';

vi.mock('../../src/hooks/useSearch');
vi.mock('../../src/hooks/useGameSearch');
vi.mock('../../src/hooks/useWishlist');

const mockMovieInLibrary: MediaDetails = {
  id: 101,
  title: 'Matrix',
  overview: 'Neo descobre a verdade sobre a realidade.',
  posterUrl: 'https://image.tmdb.org/matrix.jpg',
  backdropUrl: null,
  releaseDate: '1999-03-31',
  mediaType: 'movie',
  voteAverage: 8.7,
};

const mockMovieNotInLibrary: MediaDetails = {
  id: 102,
  title: 'Inception',
  overview: 'Dom Cobb invade sonhos.',
  posterUrl: 'https://image.tmdb.org/inception.jpg',
  backdropUrl: null,
  releaseDate: '2010-07-16',
  mediaType: 'movie',
  voteAverage: 8.8,
};

const mockGameResult: GameDetails = {
  id: '1022',
  title: 'The Legend of Zelda',
  summary: 'Aventuras em Hyrule.',
  coverUrl: 'https://images.igdb.com/cover.jpg',
  backdropUrl: null,
  releaseYear: 1986,
  genres: ['Aventura'],
  platforms: ['NES'],
  rating: 85,
};

const mockLibraryItem: LibraryItem = {
  id: 1,
  userId: 'user-123',
  tmdbId: 101,
  mediaType: 'movie',
  status: 'completed',
  userRating: 5,
  notes: 'Excelente',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  media: mockMovieInLibrary,
};

describe('Página SearchPage', () => {
  const mockFetchWishlist = vi.fn();
  const mockAddToList = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWishlist).mockReturnValue({
      items: [mockLibraryItem],
      isLoading: false,
      error: null,
      fetchWishlist: mockFetchWishlist,
      addToList: mockAddToList,
      updateListItem: vi.fn(),
      removeFromList: vi.fn(),
    });

    vi.mocked(useGameSearch).mockReturnValue({
      results: [],
      popularGames: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('chama fetchWishlist na montagem do componente', () => {
    vi.mocked(useSearch).mockReturnValue({
      results: [],
      totalResults: 0,
      totalPages: 0,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SearchPage />);
    expect(mockFetchWishlist).toHaveBeenCalledTimes(1);
  });

  it('exibe o badge "Na Biblioteca" para mídias que já estão na biblioteca', () => {
    vi.mocked(useSearch).mockReturnValue({
      results: [mockMovieInLibrary, mockMovieNotInLibrary],
      totalResults: 2,
      totalPages: 1,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SearchPage />);

    const input = screen.getByPlaceholderText(/Buscar filmes.../i);
    fireEvent.change(input, { target: { value: 'Matrix' } });

    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();

    // Matrix está na biblioteca
    expect(screen.getByText('Na Biblioteca')).toBeInTheDocument();
  });

  it('abre o modal com a indicação de que a mídia já está na biblioteca ao clicar no card', async () => {
    vi.mocked(useSearch).mockReturnValue({
      results: [mockMovieInLibrary],
      totalResults: 1,
      totalPages: 1,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SearchPage />);

    const input = screen.getByPlaceholderText(/Buscar filmes.../i);
    fireEvent.change(input, { target: { value: 'Matrix' } });

    const card = screen.getByRole('button', { name: /matrix, 1999, já está na sua biblioteca/i });
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByText('Já está na sua Biblioteca')).toBeInTheDocument();
    });
  });

  it('permite alternar para a aba "Jogos", renderizar resultados de games e abrir modal de detalhes', async () => {
    vi.mocked(useSearch).mockReturnValue({
      results: [],
      totalResults: 0,
      totalPages: 0,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useGameSearch).mockReturnValue({
      results: [mockGameResult],
      popularGames: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SearchPage />);

    // Alterna para jogos
    const jogosTab = screen.getByRole('radio', { name: /jogos/i });
    fireEvent.click(jogosTab);

    expect(screen.getByPlaceholderText(/buscar jogos/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/buscar jogos/i);
    fireEvent.change(input, { target: { value: 'Zelda' } });

    expect(screen.getByText('The Legend of Zelda')).toBeInTheDocument();

    // Clica no card do jogo
    const gameCard = screen.getByRole('button', { name: /the legend of zelda/i });
    fireEvent.click(gameCard);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quero jogar/i })).toBeInTheDocument();
    });

    // Clica em Quero Jogar
    fireEvent.click(screen.getByRole('button', { name: /quero jogar/i }));
    expect(mockAddToList).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'game',
        externalId: '1022',
        status: 'plan_to_watch',
        title: 'The Legend of Zelda',
      })
    );
  });

  it('ao clicar em "Já Zerei", abre o RatingModal para avaliar e envia o jogo com status completed, userRating e notes', async () => {
    vi.mocked(useSearch).mockReturnValue({
      results: [],
      totalResults: 0,
      totalPages: 0,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useGameSearch).mockReturnValue({
      results: [mockGameResult],
      popularGames: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<SearchPage />);

    // Alterna para jogos
    fireEvent.click(screen.getByRole('radio', { name: /jogos/i }));

    const input = screen.getByPlaceholderText(/buscar jogos/i);
    fireEvent.change(input, { target: { value: 'Zelda' } });

    // Clica no card do jogo
    const gameCard = screen.getByRole('button', { name: /the legend of zelda/i });
    fireEvent.click(gameCard);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /já zerei/i })).toBeInTheDocument();
    });

    // Clica em "Já Zerei"
    fireEvent.click(screen.getByRole('button', { name: /já zerei/i }));

    // Deve abrir o modal de avaliação
    await waitFor(() => {
      expect(screen.getByText('Quer deixar uma opinião?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /salvar avaliação/i })).toBeInTheDocument();
    });

    // Seleciona 5 estrelas
    const star5 = screen.getByRole('button', { name: /5 estrelas/i });
    fireEvent.click(star5);

    // Digita uma resenha
    const reviewInput = screen.getByPlaceholderText(/o que você achou dessa obra\?/i);
    fireEvent.change(reviewInput, { target: { value: 'Obra-prima atemporal!' } });

    // Salva a avaliação
    const saveBtn = screen.getByRole('button', { name: /salvar avaliação/i });
    fireEvent.click(saveBtn);

    expect(mockAddToList).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'game',
        externalId: '1022',
        status: 'completed',
        userRating: 5,
        notes: 'Obra-prima atemporal!',
        title: 'The Legend of Zelda',
      })
    );
  });
});
