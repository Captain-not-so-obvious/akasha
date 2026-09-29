import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameCard } from '../../../src/components/search/GameCard';
import type { GameDetails } from '../../../src/types/game';

const mockGame: GameDetails = {
  id: '1022',
  title: 'The Legend of Zelda',
  coverUrl: 'https://images.igdb.com/cover.jpg',
  backdropUrl: null,
  releaseYear: 1986,
  genres: ['Aventura', 'RPG'],
  platforms: ['NES', 'Switch'],
  rating: 85,
};

describe('Componente GameCard', () => {
  it('renderiza título, ano, plataformas e nota do jogo', () => {
    render(<GameCard game={mockGame} />);

    expect(screen.getByText('The Legend of Zelda')).toBeInTheDocument();
    expect(screen.getByText('1986')).toBeInTheDocument();
    expect(screen.getByText('NES')).toBeInTheDocument();
    expect(screen.getByText('Switch')).toBeInTheDocument();
    expect(screen.getByText('8.5')).toBeInTheDocument();
  });

  it('possui tabIndex={0} e dispara onSelect ao clicar e ao pressionar Enter (Android TV)', () => {
    const onSelect = vi.fn();
    render(<GameCard game={mockGame} onSelect={onSelect} />);

    const card = screen.getByRole('button', { name: /the legend of zelda/i });
    expect(card).toHaveAttribute('tabIndex', '0');

    // Clique com mouse / touch
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockGame);

    // D-Pad / Enter no controle remoto
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('exibe badge "Na Biblioteca" quando isInLibrary for true', () => {
    render(<GameCard game={mockGame} isInLibrary={true} />);
    expect(screen.getByText('Na Biblioteca')).toBeInTheDocument();
  });
});
