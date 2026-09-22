import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationRail } from '../../../src/components/recommendations/RecommendationRail';
import * as useRecsModule from '../../../src/hooks/useRecommendations';

vi.mock('../../../src/hooks/useRecommendations', () => ({
  useRecommendations: vi.fn(),
}));

describe('RecommendationRail Component', () => {
  const mockFetchRecommendations = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar os cards de recomendação com motivos, atalho de Início e tabIndex={0} para Android TV', () => {
    vi.mocked(useRecsModule.useRecommendations).mockReturnValue({
      recommendations: [
        {
          tmdbId: 550,
          title: 'Clube da Luta',
          overview: 'Descrição...',
          posterUrl: '/fight.jpg',
          backdropUrl: null,
          releaseDate: '2024-01-01',
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

    const startBtn = screen.getByRole('button', { name: /Voltar ao início das recomendações/i });
    expect(startBtn).toBeInTheDocument();
    expect(startBtn).toHaveAttribute('tabIndex', '0');

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
          releaseDate: '2024-01-01',
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

  it('deve disparar scrollIntoView ao focar no card (D-Pad TV)', () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    vi.mocked(useRecsModule.useRecommendations).mockReturnValue({
      recommendations: [
        {
          tmdbId: 202,
          title: 'Interstellar',
          overview: '...',
          posterUrl: null,
          backdropUrl: null,
          releaseDate: '2024-01-01',
          mediaType: 'movie',
          voteAverage: 9.0,
          reason: 'Excelente nota de crítica',
          score: 98,
          isColdStart: false,
        },
      ],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });

    render(<RecommendationRail />);

    const card = screen.getByRole('button', { name: /Interstellar/i });
    fireEvent.focus(card);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  });

  it('deve chamar scrollTo ao clicar no botão de início (TV D-Pad)', () => {
    const scrollToMock = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollToMock;

    vi.mocked(useRecsModule.useRecommendations).mockReturnValue({
      recommendations: [
        {
          tmdbId: 303,
          title: 'Inception',
          overview: '...',
          posterUrl: null,
          backdropUrl: null,
          releaseDate: '2024-01-01',
          mediaType: 'movie',
          voteAverage: 8.8,
          reason: 'Recomendado para fãs de Christopher Nolan',
          score: 92,
          isColdStart: false,
        },
      ],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });

    render(<RecommendationRail />);

    const startBtn = screen.getByRole('button', { name: /Voltar ao início das recomendações/i });
    fireEvent.click(startBtn);

    expect(scrollToMock).toHaveBeenCalledWith({
      left: 0,
      behavior: 'smooth',
    });
  });
});

