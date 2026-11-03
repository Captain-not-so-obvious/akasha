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
    notes: 'Filme excelente',
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
  const mockOnSelectItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o título, imagem, ano e status do item da biblioteca', () => {
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
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText(/Assistindo/i)).toBeInTheDocument();
    expect(screen.getByText('“Filme excelente”')).toBeInTheDocument();
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

  it('deve priorizar onSelectItem se fornecido ao clicar no card', () => {
    render(
      <LibraryItemCard
        item={mockItem}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
        onStatusChange={mockOnStatusChange}
        onSelect={mockOnSelect}
        onSelectItem={mockOnSelectItem}
      />
    );

    const card = screen.getByRole('button', { name: /Card de Fight Club/i });
    fireEvent.click(card);

    expect(mockOnSelectItem).toHaveBeenCalledTimes(1);
    expect(mockOnSelectItem).toHaveBeenCalledWith(mockItem);
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

  it('deve disparar onSelect com a tecla Espaço em navegação por teclado (TV / D-Pad)', () => {
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
    fireEvent.keyDown(card, { key: ' ', code: 'Space' });

    expect(mockOnSelect).toHaveBeenCalledWith(mockItem.media);
  });

  it('não deve possuir botões aninhados de atalho na superfície do card para evitar armadilhas no controle da TV', () => {
    render(
      <LibraryItemCard
        item={mockItem}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
        onStatusChange={mockOnStatusChange}
        onSelect={mockOnSelect}
      />
    );

    // O único botão no componente deve ser o próprio card
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('tabIndex', '0');
    expect(buttons[0]).toHaveClass('tv-focus-glow');

    // Botões que causavam erros bobos no D-Pad da TV não devem existir na superfície do card
    expect(screen.queryByRole('button', { name: /Remover/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Avaliar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mudar para/i })).not.toBeInTheDocument();
  });
});
