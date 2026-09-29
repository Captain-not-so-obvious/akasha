import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameRecommendationRail } from '../../../src/components/recommendations/GameRecommendationRail';
import * as useGameRecsModule from '../../../src/hooks/useGameRecommendations';

vi.mock('../../../src/hooks/useGameRecommendations', () => ({
  useGameRecommendations: vi.fn(),
}));

describe('GameRecommendationRail Component', () => {
  const mockFetchRecommendations = vi.fn();
  const mockSelectGame = vi.fn();
  const mockQuickAdd = vi.fn();

  const mockGameRec = {
    id: '1024',
    title: 'The Witcher 3: Wild Hunt',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
    backdropUrl: null,
    releaseYear: 2015,
    genres: ['RPG', 'Aventura'],
    platforms: ['PC', 'PlayStation 5'],
    developer: 'CD Projekt RED',
    rating: 93,
    score: 95,
    reason: 'Porque você jogou Elden Ring e curte RPGs',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGameRecsModule.useGameRecommendations).mockReturnValue({
      recommendations: [mockGameRec],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });
  });

  it('deve renderizar o título do trilho e o card do jogo recomendado', () => {
    render(<GameRecommendationRail onSelectGame={mockSelectGame} onQuickAdd={mockQuickAdd} />);

    expect(screen.getByText('Akasha Sugere para Jogar')).toBeInTheDocument();
    expect(screen.getByText('The Witcher 3: Wild Hunt')).toBeInTheDocument();
    expect(screen.getByText(/Porque você jogou Elden Ring/i)).toBeInTheDocument();
    expect(screen.getByText('93%')).toBeInTheDocument();
  });

  it('deve disparar onSelectGame ao clicar no card do jogo', () => {
    render(<GameRecommendationRail onSelectGame={mockSelectGame} onQuickAdd={mockQuickAdd} />);

    const card = screen.getByRole('button', { name: /The Witcher 3/i });
    fireEvent.click(card);

    expect(mockSelectGame).toHaveBeenCalledWith(mockGameRec);
  });

  it('deve disparar onQuickAdd ao clicar em "+ Quero Jogar"', () => {
    render(<GameRecommendationRail onSelectGame={mockSelectGame} onQuickAdd={mockQuickAdd} />);

    const quickAddBtn = screen.getByRole('button', { name: /\+ Quero Jogar/i });
    fireEvent.click(quickAddBtn);

    expect(mockQuickAdd).toHaveBeenCalledWith(mockGameRec);
  });

  it('deve possuir tabIndex={0} para acessibilidade por controle remoto no Android TV', () => {
    render(<GameRecommendationRail onSelectGame={mockSelectGame} onQuickAdd={mockQuickAdd} />);

    const card = screen.getByRole('button', { name: /The Witcher 3/i });
    expect(card).toHaveAttribute('tabIndex', '0');
  });
});
