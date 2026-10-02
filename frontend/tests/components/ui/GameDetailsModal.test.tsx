import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameDetailsModal } from '../../../src/components/ui/GameDetailsModal';
import type { GameDetails } from '../../../src/types/game';
import type { LibraryItem } from '../../../src/types/wishlist';

const mockGame: GameDetails = {
  id: '1022',
  title: 'The Legend of Zelda',
  summary: 'Link parte em uma jornada épica por Hyrule.',
  coverUrl: 'https://images.igdb.com/cover.jpg',
  backdropUrl: 'https://images.igdb.com/backdrop.jpg',
  releaseYear: 1986,
  genres: ['Aventura', 'RPG'],
  platforms: ['NES', 'Nintendo Switch'],
  rating: 85,
};

const mockLibraryItem: LibraryItem = {
  id: 10,
  userId: 'user-123',
  domain: 'game',
  externalId: '1022',
  status: 'plan_to_watch',
  userRating: null,
  notes: null,
  title: 'The Legend of Zelda',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  media: {
    id: 1022,
    title: 'The Legend of Zelda',
    overview: 'Link parte em uma jornada épica.',
    posterUrl: null,
    backdropUrl: null,
    releaseDate: '1986-01-01',
    mediaType: 'movie',
    voteAverage: 8.5,
  },
};

describe('Componente GameDetailsModal', () => {
  it('não renderiza nada se isOpen for false ou game for null', () => {
    const { container } = render(
      <GameDetailsModal game={mockGame} isOpen={false} onClose={vi.fn()} onAdd={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, sinopse, plataformas e botões de adicionar quando não está na biblioteca', () => {
    const onAdd = vi.fn();
    render(
      <GameDetailsModal game={mockGame} isOpen={true} onClose={vi.fn()} onAdd={onAdd} isInLibrary={false} />
    );

    expect(screen.getByText('The Legend of Zelda')).toBeInTheDocument();
    expect(screen.getByText(/Link parte em uma jornada épica/i)).toBeInTheDocument();
    expect(screen.getByText('Nintendo Switch')).toBeInTheDocument();

    const queroJogarBtn = screen.getByRole('button', { name: /quero jogar/i });
    expect(queroJogarBtn).toHaveAttribute('tabIndex', '0');

    fireEvent.click(queroJogarBtn);
    expect(onAdd).toHaveBeenCalledWith(mockGame, 'plan_to_watch');
  });

  it('ao clicar em "Quero Jogar", coloca o botão em espera com loader e transiciona para "Já está na sua Biblioteca"', async () => {
    let resolveAdd: () => void = () => {};
    const pendingPromise = new Promise<void>((resolve) => {
      resolveAdd = resolve;
    });
    const onAdd = vi.fn().mockImplementation(() => pendingPromise);

    render(
      <GameDetailsModal game={mockGame} isOpen={true} onClose={vi.fn()} onAdd={onAdd} isInLibrary={false} />
    );

    const queroJogarBtn = screen.getByRole('button', { name: /quero jogar/i });
    fireEvent.click(queroJogarBtn);

    // Estado de espera (loader ativo)
    expect(screen.getByText(/adicionando\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionando\.\.\./i })).toBeDisabled();

    // Resolve a promise simulando resposta da API
    resolveAdd();

    await waitFor(() => {
      expect(screen.getByText('Já está na sua Biblioteca')).toBeInTheDocument();
    });
  });

  it('ao clicar em "Jogando Agora", coloca o botão em espera com loader e transiciona para "Já está na sua Biblioteca"', async () => {
    let resolveAdd: () => void = () => {};
    const pendingPromise = new Promise<void>((resolve) => {
      resolveAdd = resolve;
    });
    const onAdd = vi.fn().mockImplementation(() => pendingPromise);

    render(
      <GameDetailsModal game={mockGame} isOpen={true} onClose={vi.fn()} onAdd={onAdd} isInLibrary={false} />
    );

    const jogandoBtn = screen.getByRole('button', { name: /jogando agora/i });
    fireEvent.click(jogandoBtn);

    // Estado de espera (loader ativo)
    expect(screen.getByText(/iniciando\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciando\.\.\./i })).toBeDisabled();

    // Resolve a promise
    resolveAdd();

    await waitFor(() => {
      expect(screen.getByText('Já está na sua Biblioteca')).toBeInTheDocument();
    });
  });

  it('renderiza indicação de que já está na biblioteca e opções de status quando isInLibrary for true', () => {
    const onStatusChange = vi.fn();
    const onRemove = vi.fn();

    render(
      <GameDetailsModal
        game={mockGame}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        isInLibrary={true}
        libraryItem={mockLibraryItem}
        onStatusChange={onStatusChange}
        onRemove={onRemove}
      />
    );

    expect(screen.getByText('Já está na sua Biblioteca')).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /começar a jogar/i });
    fireEvent.click(startBtn);
    expect(onStatusChange).toHaveBeenCalledWith(mockLibraryItem, 'watching');

    const removeBtn = screen.getByRole('button', { name: /remover/i });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(mockLibraryItem);
  });

  it('fecha o modal ao pressionar Escape ou ao clicar no botão fechar', () => {
    const onClose = vi.fn();
    render(
      <GameDetailsModal game={mockGame} isOpen={true} onClose={onClose} onAdd={vi.fn()} />
    );

    const closeBtn = screen.getByRole('button', { name: /fechar detalhes/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('exibe o motivo da recomendação separadamente sem substituir o resumo/sinopse original do jogo', () => {
    const recommendedGame: GameDetails = {
      ...mockGame,
      summary: 'Explore o reino vasto de Hyrule e derrote Ganon.',
      reason: 'Porque você curtiu jogos épicos de exploração e RPG',
    };

    render(
      <GameDetailsModal game={recommendedGame} isOpen={true} onClose={vi.fn()} onAdd={vi.fn()} />
    );

    // O motivo da recomendação deve estar na seção de recomendação
    expect(screen.getByText('Por que o Akasha recomenda este jogo?')).toBeInTheDocument();
    expect(screen.getByText('Porque você curtiu jogos épicos de exploração e RPG')).toBeInTheDocument();

    // A sinopse do jogo deve ser a história real da obra, não o motivo de ML
    expect(screen.getByText('Sinopse')).toBeInTheDocument();
    expect(screen.getByText('Explore o reino vasto de Hyrule e derrote Ganon.')).toBeInTheDocument();
  });
});
