import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchPage } from './Search';
import { useSearch } from '../hooks/useSearch';
import { useWishlist } from '../hooks/useWishlist';
import type { MediaDetails } from '../types/media';
import type { LibraryItem } from '../types/wishlist';

vi.mock('../hooks/useSearch');
vi.mock('../hooks/useWishlist');

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
  });

  it('chama fetchWishlist na montagem do componente', () => {
    vi.mocked(useSearch).mockReturnValue({
      results: [],
      totalResults: 0,
      isLoading: false,
      error: null,
    });

    render(<SearchPage />);
    expect(mockFetchWishlist).toHaveBeenCalledTimes(1);
  });

  it('exibe o badge "Na Biblioteca" para mídias que já estão na biblioteca', () => {
    vi.mocked(useSearch).mockReturnValue({
      results: [mockMovieInLibrary, mockMovieNotInLibrary],
      totalResults: 2,
      isLoading: false,
      error: null,
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
      isLoading: false,
      error: null,
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
});
