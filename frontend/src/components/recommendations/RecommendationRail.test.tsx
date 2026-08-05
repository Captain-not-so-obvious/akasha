import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationRail } from './RecommendationRail';
import * as useRecsModule from '../../hooks/useRecommendations';

vi.mock('../../hooks/useRecommendations', () => ({
  useRecommendations: vi.fn(),
}));

describe('RecommendationRail Component', () => {
  const mockFetchRecommendations = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar os cards de recomendação com motivos e tabIndex={0} para Android TV', () => {
    vi.mocked(useRecsModule.useRecommendations).mockReturnValue({
      recommendations: [
        {
          tmdbId: 550,
          title: 'Clube da Luta',
          overview: 'Descrição...',
          posterUrl: '/fight.jpg',
          backdropUrl: null,
          mediaType: 'movie',
          voteAverage: 8.4,
          reason: 'Porque você avaliou com 5★',
          score: 95,
          isColdStart: false,
        },
      ],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });

    render(<RecommendationRail />);

    expect(screen.getByText('Recomendados para Você')).toBeInTheDocument();
    expect(screen.getByText('Clube da Luta')).toBeInTheDocument();
    expect(screen.getByText('Porque você avaliou com 5★')).toBeInTheDocument();

    const card = screen.getByRole('button', { name: /Clube da Luta/i });
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('deve disparar onSelectMedia ao pressionar Enter (Android TV D-Pad)', () => {
    const handleSelect = vi.fn();

    vi.mocked(useRecsModule.useRecommendations).mockReturnValue({
      recommendations: [
        {
          tmdbId: 101,
          title: 'Matrix',
          overview: '...',
          posterUrl: null,
          backdropUrl: null,
          mediaType: 'movie',
          voteAverage: 8.7,
          reason: 'Recomendação baseada em Ficção Científica',
          score: 90,
          isColdStart: false,
        },
      ],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });

    render(<RecommendationRail onSelectMedia={handleSelect} />);

    const card = screen.getByRole('button', { name: /Matrix/i });
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 101,
        title: 'Matrix',
      })
    );
  });
});
