import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BookDetailsModal } from '../../../src/components/ui/BookDetailsModal';
import type { BookDetails } from '../../../src/types/book';
import type { LibraryItem } from '../../../src/types/wishlist';

const mockBook: BookDetails = {
  id: 'vol-dom-casmurro',
  title: 'Dom Casmurro',
  subtitle: 'Edição Crítica',
  authors: ['Machado de Assis'],
  description: 'Um clássico imortal sobre Bento Santiago e Capitu.',
  publisher: 'Editora Garnier',
  releaseYear: 1899,
  categories: ['Ficção', 'Literatura Brasileira'],
  pageCount: 256,
  isbn13: '9788535914849',
  averageRating: 4.8,
  ratingsCount: 150,
  coverUrl: 'https://books.google.com/cover.jpg',
};

const mockLibraryItem: LibraryItem = {
  id: 10,
  userId: 'user-123',
  domain: 'book',
  externalId: 'vol-dom-casmurro',
  status: 'plan_to_watch',
  userRating: null,
  notes: null,
  title: 'Dom Casmurro',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  media: {
    id: 1,
    title: 'Dom Casmurro',
    overview: 'Um clássico imortal.',
    posterUrl: null,
    backdropUrl: null,
    releaseDate: '1899-01-01',
    mediaType: 'movie',
    voteAverage: 9.0,
  },
};

describe('Componente BookDetailsModal', () => {
  it('não renderiza nada se isOpen for false ou book for null', () => {
    const { container } = render(
      <BookDetailsModal book={mockBook} isOpen={false} onClose={vi.fn()} onAdd={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, sinopse, autores, páginas, ISBN e botões de ação quando não está na estante', () => {
    const onAdd = vi.fn();
    render(
      <BookDetailsModal book={mockBook} isOpen={true} onClose={vi.fn()} onAdd={onAdd} isInLibrary={false} />
    );

    expect(screen.getByText('Dom Casmurro')).toBeInTheDocument();
    expect(screen.getByText('Machado de Assis')).toBeInTheDocument();
    expect(screen.getByText(/Um clássico imortal sobre Bento Santiago/i)).toBeInTheDocument();
    expect(screen.getByText(/256 páginas/i)).toBeInTheDocument();
    expect(screen.getByText(/ISBN: 9788535914849/i)).toBeInTheDocument();

    const queroLerBtn = screen.getByRole('button', { name: /quero ler/i });
    expect(queroLerBtn).toHaveAttribute('tabIndex', '0');

    fireEvent.click(queroLerBtn);
    expect(onAdd).toHaveBeenCalledWith(mockBook, 'plan_to_watch');
  });

  it('renderiza ações de "Lendo", "Marcar como Lido" e "Remover" quando já está na estante', () => {
    const onRemove = vi.fn();
    const onStatusChange = vi.fn();

    render(
      <BookDetailsModal
        book={mockBook}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        isInLibrary={true}
        libraryItem={mockLibraryItem}
        onRemove={onRemove}
        onStatusChange={onStatusChange}
      />
    );

    expect(screen.getByText('Este livro já está na sua estante.')).toBeInTheDocument();

    const lendoBtn = screen.getByRole('button', { name: /lendo/i });
    fireEvent.click(lendoBtn);
    expect(onStatusChange).toHaveBeenCalledWith(mockLibraryItem, 'watching');

    const lidoBtn = screen.getByRole('button', { name: /marcar como lido/i });
    fireEvent.click(lidoBtn);
    expect(onStatusChange).toHaveBeenCalledWith(mockLibraryItem, 'completed');

    const removerBtn = screen.getByRole('button', { name: /remover/i });
    fireEvent.click(removerBtn);
    expect(onRemove).toHaveBeenCalledWith(mockLibraryItem);
  });

  it('exibe o motivo da recomendação separadamente sem substituir a sinopse original', () => {
    const recommendedBook: BookDetails = {
      ...mockBook,
      title: 'Animal Farm',
      description: 'Uma fábula alegórica onde os animais assumem a granja.',
      reason: 'Porque você apreciou obras de George Orwell',
    };

    render(
      <BookDetailsModal
        book={recommendedBook}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
      />
    );

    // O motivo da recomendação deve estar na seção de recomendação
    expect(screen.getByText('Por que o Akasha recomenda este livro?')).toBeInTheDocument();
    expect(screen.getByText('Porque você apreciou obras de George Orwell')).toBeInTheDocument();

    // A sinopse deve ser a história real da obra, não o motivo de ML
    expect(screen.getByText('Sinopse')).toBeInTheDocument();
    expect(screen.getByText('Uma fábula alegórica onde os animais assumem a granja.')).toBeInTheDocument();
  });
});
