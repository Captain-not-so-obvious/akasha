import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaDetailsModal } from './MediaDetailsModal';
import type { MediaDetails } from '../../types/media';
import type { LibraryItem } from '../../types/wishlist';

describe('MediaDetailsModal Component', () => {
  const mockMedia: MediaDetails = {
    id: 550,
    title: 'Fight Club',
    overview: 'Um homem insatisfeito forma um clube de lutas clandestino.',
    posterUrl: '/poster.jpg',
    backdropUrl: '/backdrop.jpg',
    releaseDate: '1999-10-15',
    mediaType: 'movie',
    voteAverage: 8.4,
  };

  const mockLibraryItem: LibraryItem = {
    id: 1,
    userId: 'user-123',
    tmdbId: 550,
    mediaType: 'movie',
    status: 'watching',
    userRating: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    media: mockMedia,
  };

  const mockOnClose = vi.fn();
  const mockOnAdd = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnStatusChange = vi.fn();
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve renderizar nada se isOpen for false', () => {
    const { container } = render(
      <MediaDetailsModal
        media={mockMedia}
        isOpen={false}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar botão "Adicionar à Biblioteca" quando não está na biblioteca', () => {
    render(
      <MediaDetailsModal
        media={mockMedia}
        isOpen={true}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
        isInLibrary={false}
      />
    );

    const addButton = screen.getByRole('button', { name: /Adicionar à Biblioteca/i });
    expect(addButton).toBeInTheDocument();
    
    fireEvent.click(addButton);
    expect(mockOnAdd).toHaveBeenCalledWith(mockMedia);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('deve renderizar fallback "Já está na sua Biblioteca" quando isInLibrary é true mas falta libraryItem', () => {
    render(
      <MediaDetailsModal
        media={mockMedia}
        isOpen={true}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
        isInLibrary={true}
      />
    );

    expect(screen.getByText(/Já está na sua Biblioteca/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Concluir/i })).not.toBeInTheDocument();
  });

  it('deve renderizar botões de ação (Concluir, Avaliar, Remover) quando isInLibrary é true e libraryItem é fornecido', () => {
    render(
      <MediaDetailsModal
        media={mockMedia}
        isOpen={true}
        onClose={mockOnClose}
        onAdd={mockOnAdd}
        isInLibrary={true}
        libraryItem={mockLibraryItem}
        onRemove={mockOnRemove}
        onStatusChange={mockOnStatusChange}
        onEdit={mockOnEdit}
      />
    );

    const completeBtn = screen.getByRole('button', { name: /Concluir/i });
    const editBtn = screen.getByRole('button', { name: /Avaliar/i });
    const removeBtn = screen.getByRole('button', { name: /Remover/i });

    expect(completeBtn).toBeInTheDocument();
    expect(editBtn).toBeInTheDocument();
    expect(removeBtn).toBeInTheDocument();

    // Testa ação Concluir
    fireEvent.click(completeBtn);
    expect(mockOnStatusChange).toHaveBeenCalledWith(mockLibraryItem, 'completed');
    expect(mockOnClose).toHaveBeenCalled();
    
    // Testa ação Avaliar
    fireEvent.click(editBtn);
    expect(mockOnEdit).toHaveBeenCalledWith(mockLibraryItem);

    // Testa ação Remover
    fireEvent.click(removeBtn);
    expect(mockOnRemove).toHaveBeenCalledWith(mockLibraryItem);
  });
});
