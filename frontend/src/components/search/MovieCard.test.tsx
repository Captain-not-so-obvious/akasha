import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MovieCard } from './MovieCard';
import type { MediaDetails } from '../../types/media';

const mockMovie: MediaDetails = {
  id: 42,
  title: 'Duna',
  overview: 'Uma história épica de ficção científica.',
  posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
  backdropUrl: null,
  releaseDate: '2021-10-22',
  mediaType: 'movie',
  voteAverage: 8.0,
};

const mockSeries: MediaDetails = {
  id: 99,
  title: 'Breaking Bad',
  overview: 'Um professor de química vira traficante.',
  posterUrl: null,
  backdropUrl: null,
  releaseDate: '2008-01-20',
  mediaType: 'tv',
  voteAverage: 9.5,
};

describe('Componente MovieCard', () => {
  it('deve renderizar o título e o ano do filme', () => {
    render(<MovieCard media={mockMovie} />);

    expect(screen.getByText('Duna')).toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
  });

  it('deve exibir o badge "Filme" para mediaType movie', () => {
    render(<MovieCard media={mockMovie} />);
    expect(screen.getByText('Filme')).toBeInTheDocument();
  });

  it('deve exibir o badge "Série" para mediaType tv', () => {
    render(<MovieCard media={mockSeries} />);
    expect(screen.getByText('Série')).toBeInTheDocument();
  });

  it('deve exibir a nota quando voteAverage estiver presente', () => {
    render(<MovieCard media={mockMovie} />);
    expect(screen.getByText('8.0')).toBeInTheDocument();
  });

  it('chama onSelect ao clicar no card', () => {
    const onSelect = vi.fn();
    render(<MovieCard media={mockMovie} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /duna/i }));
    expect(onSelect).toHaveBeenCalledWith(mockMovie);
  });

  it('chama onSelect ao pressionar Enter no card (D-Pad TV)', () => {
    const onSelect = vi.fn();
    render(<MovieCard media={mockMovie} onSelect={onSelect} />);

    const card = screen.getByRole('button', { name: /duna/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(mockMovie);
  });

  it('chama onSelect ao pressionar Space no card (D-Pad TV)', () => {
    const onSelect = vi.fn();
    render(<MovieCard media={mockMovie} onSelect={onSelect} />);

    const card = screen.getByRole('button', { name: /duna/i });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledWith(mockMovie);
  });

  it('tem tabIndex={0} para ser navegável por D-Pad/teclado', () => {
    render(<MovieCard media={mockMovie} />);
    expect(screen.getByRole('button', { name: /duna/i })).toHaveAttribute('tabindex', '0');
  });

  it('não exibe a nota quando voteAverage é null', () => {
    const mediaWithoutRating = { ...mockMovie, voteAverage: null };
    render(<MovieCard media={mediaWithoutRating} />);
    expect(screen.queryByText(/\d+\.\d/)).not.toBeInTheDocument();
  });
});
