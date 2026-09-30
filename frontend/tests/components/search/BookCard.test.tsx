import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BookCard } from '../../../src/components/search/BookCard';
import type { BookDetails } from '../../../src/types/book';

const mockBook: BookDetails = {
  id: 'vol-dom-casmurro',
  title: 'Dom Casmurro',
  authors: ['Machado de Assis'],
  coverUrl: 'https://books.google.com/cover.jpg',
  releaseYear: 1899,
  categories: ['Clássicos', 'Ficção'],
  pageCount: 256,
  averageRating: 4.8,
};

describe('Componente BookCard', () => {
  it('renderiza título, autores, ano, número de páginas e nota do livro', () => {
    render(<BookCard book={mockBook} />);

    expect(screen.getByText('Dom Casmurro')).toBeInTheDocument();
    expect(screen.getByText('Machado de Assis')).toBeInTheDocument();
    expect(screen.getByText('1899')).toBeInTheDocument();
    expect(screen.getByText(/256 pág\./i)).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
  });

  it('possui tabIndex={0} e dispara onSelect ao clicar e ao pressionar Enter (Android TV)', () => {
    const onSelect = vi.fn();
    render(<BookCard book={mockBook} onSelect={onSelect} />);

    const card = screen.getByRole('button', { name: /dom casmurro por machado de assis/i });
    expect(card).toHaveAttribute('tabIndex', '0');

    // Clique com mouse / touch
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockBook);

    // D-Pad / Enter no controle remoto
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('exibe badge "Na Estante" quando isInLibrary for true', () => {
    render(<BookCard book={mockBook} isInLibrary={true} />);
    expect(screen.getByText('Na Estante')).toBeInTheDocument();
  });
});
