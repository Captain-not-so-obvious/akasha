import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Library } from '../../src/pages/Library';
import * as useWishlistModule from '../../src/hooks/useWishlist';
import * as useRecsModule from '../../src/hooks/useRecommendations';

vi.mock('../../src/hooks/useWishlist', () => ({
  useWishlist: vi.fn(),
}));

vi.mock('../../src/hooks/useRecommendations', () => ({
  useRecommendations: vi.fn(),
}));

describe('Library Page', () => {
  const mockFetchWishlist = vi.fn();
  const mockUpdateListItem = vi.fn();
  const mockRemoveFromList = vi.fn();
  const mockAddToList = vi.fn();
  const mockFetchRecommendations = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useWishlistModule.useWishlist).mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      fetchWishlist: mockFetchWishlist,
      updateListItem: mockUpdateListItem,
      removeFromList: mockRemoveFromList,
      addToList: mockAddToList,
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
    render(<Library />);

    const card = screen.getByRole('button', { name: /Interstellar/i });
    expect(card).toBeInTheDocument();

    // Clica no card de recomendação
    fireEvent.click(card);

    // O modal deve ser exibido com os detalhes e o botão de adicionar à biblioteca
    expect(screen.getByRole('button', { name: /Adicionar à Biblioteca/i })).toBeInTheDocument();
  });

  it('deve chamar addToList ao clicar em Adicionar à Biblioteca no modal de recomendação', () => {
    render(<Library />);

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
});
