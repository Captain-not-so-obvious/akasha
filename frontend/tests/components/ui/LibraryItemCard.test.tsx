import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LibraryItemCard } from '../../../src/components/ui/LibraryItemCard';
import type { LibraryItem } from '../../../src/types/wishlist';

describe('LibraryItemCard Component', () => {
  const mockItem: LibraryItem = {
    id: 1,
    userId: 'user-123',
    tmdbId: 550,
    mediaType: 'movie',
    status: 'watching',
    userRating: 4.5,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    media: {
      id: 550,
      title: 'Fight Club',
      overview: 'Um homem insatisfeito forma um clube de lutas clandestino.',
      posterUrl: '/poster.jpg',
      backdropUrl: '/backdrop.jpg',
      releaseDate: '1999-10-15',
      mediaType: 'movie',
      voteAverage: 8.4,
    },
  };

  const mockOnEdit = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnStatusChange = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o título e imagem do item da biblioteca', () => {
    render(
      <LibraryItemCard
        item={mockItem}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
        onStatusChange={mockOnStatusChange}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Fight Club')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Card de Fight Club/i })).toBeInTheDocument();
  });

  it('deve chamar onSelect ao clicar no card', () => {
    render(
      <LibraryItemCard
        item={mockItem}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
        onStatusChange={mockOnStatusChange}
        onSelect={mockOnSelect}
      />
    );

    const card = screen.getByRole('button', { name: /Card de Fight Club/i });
    fireEvent.click(card);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(mockItem.media);
  });

  it('deve chamar onSelect ao clicar no botão de ícone de Sinopse', () => {
    render(
      <LibraryItemCard
        item={mockItem}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
        onStatusChange={mockOnStatusChange}
        onSelect={mockOnSelect}
      />
    );

    const infoButton = screen.getByRole('button', { name: /Ver sinopse de Fight Club/i });
    fireEvent.click(infoButton);

    expect(mockOnSelect).toHaveBeenCalledWith(mockItem.media);
  });

  it('não deve disparar onSelect ao clicar no botão de Avaliar ou Remover (stopPropagation)', () => {
    render(
      <LibraryItemCard
        item={mockItem}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
        onStatusChange={mockOnStatusChange}
        onSelect={mockOnSelect}
      />
    );

    const editButton = screen.getByRole('button', { name: /Avaliar Fight Club/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
    expect(mockOnSelect).not.toHaveBeenCalled();

    const removeButton = screen.getByRole('button', { name: /Remover Fight Club da biblioteca/i });
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith(mockItem);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('deve disparar onSelect com a tecla Enter em navegação por teclado (TV / D-Pad)', () => {
    render(
      <LibraryItemCard
        item={mockItem}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
        onStatusChange={mockOnStatusChange}
        onSelect={mockOnSelect}
      />
    );

    const card = screen.getByRole('button', { name: /Card de Fight Club/i });
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

    expect(mockOnSelect).toHaveBeenCalledWith(mockItem.media);
  });
});
