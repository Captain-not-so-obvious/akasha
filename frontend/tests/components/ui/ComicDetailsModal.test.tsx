import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ComicDetailsModal } from '../../../src/components/ui/ComicDetailsModal';
import * as apiModule from '../../../src/lib/api';
import type { ComicDetails } from '../../../src/types/comic';
import type { LibraryItem } from '../../../src/types/wishlist';

const mockComic: ComicDetails = {
  id: 'cv-4050-18233',
  title: 'Batman: O Longo Dia das Bruxas',
  originalTitle: 'Batman: The Long Halloween',
  type: 'comic',
  scope: 'saga',
  coverUrl: 'https://comicvine.gamespot.com/cover.jpg',
  releaseYear: 1996,
  publisher: 'DC Comics',
  creators: ['Jeph Loeb', 'Tim Sale'],
  genres: ['Mistério', 'Super-herói', 'Noir'],
  issueCount: 13,
  description: 'Um assassino misterioso age nos feriados de Gotham.',
  issues: [
    { id: '1', issueNumber: '1', name: 'Batman: The Long Halloween #1', releaseDate: '1996-10-01' },
    { id: '2', issueNumber: '2', name: 'Batman: The Long Halloween #2', releaseDate: '1996-11-01' },
  ],
};

const mockManga: ComicDetails = {
  id: 'al-30002',
  title: 'Berserk',
  originalTitle: 'ベルセルク',
  type: 'manga',
  coverUrl: 'https://s4.anilist.co/berserk.jpg',
  releaseYear: 1989,
  publisher: 'Mangá Japonês',
  creators: ['Kentaro Miura'],
  genres: ['Dark Fantasy', 'Ação'],
  volumeCount: 42,
  description: 'A jornada sombria de Guts, o Espadachim Negro.',
};

const mockLibraryItem: LibraryItem = {
  id: 20,
  userId: 'user-123',
  domain: 'comic',
  externalId: 'cv-4050-18233',
  status: 'plan_to_watch',
  userRating: null,
  notes: null,
  title: 'Batman: O Longo Dia das Bruxas',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  media: {
    id: 1,
    title: 'Batman: O Longo Dia das Bruxas',
    overview: 'Um assassino misterioso age nos feriados.',
    posterUrl: null,
    backdropUrl: null,
    releaseDate: '1996-10-01',
    mediaType: 'movie',
    voteAverage: 9.2,
  },
};

describe('Componente ComicDetailsModal', () => {
  it('não renderiza nada se isOpen for false ou comic for null', () => {
    const { container } = render(
      <ComicDetailsModal comic={mockComic} isOpen={false} onClose={vi.fn()} onAdd={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, criadores, editora, sinopse e botão de adicionar', () => {
    const onAdd = vi.fn();
    render(
      <ComicDetailsModal comic={mockComic} isOpen={true} onClose={vi.fn()} onAdd={onAdd} isInLibrary={false} />
    );

    expect(screen.getByText('Batman: O Longo Dia das Bruxas')).toBeInTheDocument();
    expect(screen.getByText(/Jeph Loeb, Tim Sale/i)).toBeInTheDocument();
    expect(screen.getByText('DC Comics')).toBeInTheDocument();
    expect(screen.getByText(/Um assassino misterioso age nos feriados de Gotham/i)).toBeInTheDocument();
    expect(screen.getByText(/13 edições/i)).toBeInTheDocument();

    const queroLerBtn = screen.getByRole('button', { name: /quero ler/i });
    expect(queroLerBtn).toHaveAttribute('tabIndex', '0');

    fireEvent.click(queroLerBtn);
    expect(onAdd).toHaveBeenCalledWith(mockComic, 'plan_to_watch');
  });

  it('permite alternar (toggle accordion) para enumerar as edições que compõem a saga', () => {
    render(
      <ComicDetailsModal comic={mockComic} isOpen={true} onClose={vi.fn()} onAdd={vi.fn()} isInLibrary={false} />
    );

    // O accordion começa recolhido
    expect(screen.queryByText('Batman: The Long Halloween #1')).not.toBeInTheDocument();

    // Clica no toggle para abrir a enumeração das edições
    const toggleButton = screen.getByRole('button', { name: /ver edições da saga/i });
    expect(toggleButton).toHaveAttribute('tabIndex', '0');
    fireEvent.click(toggleButton);

    // Agora as edições individuais estão visíveis
    expect(screen.getByText('Batman: The Long Halloween #1')).toBeInTheDocument();
    expect(screen.getByText('Batman: The Long Halloween #2')).toBeInTheDocument();

    // Clica novamente para fechar o toggle
    const toggleCloseButton = screen.getByRole('button', { name: /ocultar edições da saga/i });
    fireEvent.click(toggleCloseButton);
    expect(screen.queryByText('Batman: The Long Halloween #1')).not.toBeInTheDocument();
  });

  it('renderiza indicação de que já está na biblioteca e opções contextuais quando isInLibrary for true', () => {
    const onRemove = vi.fn();
    const onStatusChange = vi.fn();

    render(
      <ComicDetailsModal
        comic={mockComic}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        isInLibrary={true}
        libraryItem={mockLibraryItem}
        onRemove={onRemove}
        onStatusChange={onStatusChange}
      />
    );

    expect(screen.getByText('Já está na sua Biblioteca')).toBeInTheDocument();

    const lendoBtn = screen.getByRole('button', { name: /começar a ler/i });
    fireEvent.click(lendoBtn);
    expect(onStatusChange).toHaveBeenCalledWith(mockLibraryItem, 'watching');

    const lidoBtn = screen.getByRole('button', { name: /marcar como lido/i });
    fireEvent.click(lidoBtn);
    expect(onStatusChange).toHaveBeenCalledWith(mockLibraryItem, 'completed');

    const removerBtn = screen.getByRole('button', { name: /remover/i });
    fireEvent.click(removerBtn);
    expect(onRemove).toHaveBeenCalledWith(mockLibraryItem);
  });

  it('ao clicar em "Quero Ler", coloca o botão em espera com loader e transiciona para "Já está na sua Biblioteca"', async () => {
    let resolveAdd: () => void = () => {};
    const pendingPromise = new Promise<void>((resolve) => {
      resolveAdd = resolve;
    });
    const onAdd = vi.fn().mockImplementation(() => pendingPromise);

    render(
      <ComicDetailsModal comic={mockComic} isOpen={true} onClose={vi.fn()} onAdd={onAdd} isInLibrary={false} />
    );

    const queroLerBtn = screen.getByRole('button', { name: /quero ler/i });
    fireEvent.click(queroLerBtn);

    // Estado de espera (loader ativo)
    expect(screen.getByText(/adicionando\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionando\.\.\./i })).toBeDisabled();

    // Resolve a promise simulando confirmação do backend
    resolveAdd();

    await waitFor(() => {
      expect(screen.getByText('Já está na sua Biblioteca')).toBeInTheDocument();
    });
  });

  it('renderiza corretamente metadados específicos de Mangá e Sinopse do Mangá', () => {
    render(
      <ComicDetailsModal comic={mockManga} isOpen={true} onClose={vi.fn()} onAdd={vi.fn()} />
    );

    expect(screen.getByText('Berserk')).toBeInTheDocument();
    expect(screen.getByText('Mangá')).toBeInTheDocument();
    expect(screen.getByText('Sinopse do Mangá')).toBeInTheDocument();
    expect(screen.getByText('Kentaro Miura')).toBeInTheDocument();
    expect(screen.getByText(/A jornada sombria de Guts/i)).toBeInTheDocument();
  });

  it('mantém todas as informações do mangá persistentes na tela durante e após a consulta de edições pela API', async () => {
    const apiFetchSpy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'al-30002',
        title: 'Berserk',
        type: 'manga',
        coverUrl: 'https://s4.anilist.co/berserk.jpg',
        description: 'A jornada sombria de Guts, o Espadachim Negro.',
        creators: ['Kentaro Miura'],
        volumeCount: 42,
        issues: [
          { id: 'vol-1', name: 'Berserk - Volume 1', issueNumber: '1' },
          { id: 'vol-2', name: 'Berserk - Volume 2', issueNumber: '2' },
        ],
      }),
    } as Response);

    render(
      <ComicDetailsModal comic={mockManga} isOpen={true} onClose={vi.fn()} onAdd={vi.fn()} />
    );

    // Imediatamente ao abrir, o título e a capa original devem estar visíveis
    expect(screen.getByText('Berserk')).toBeInTheDocument();
    expect(screen.getByText('Mangá')).toBeInTheDocument();
    expect(screen.getByText('Kentaro Miura')).toBeInTheDocument();

    // Espera a resolução do fetch complementar
    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalledWith('/comics/al-30002');
    });

    // Garante que o título continua existindo e não sumiu
    expect(screen.getByText('Berserk')).toBeInTheDocument();
    expect(screen.getByText('Mangá')).toBeInTheDocument();
    expect(screen.getByText('Kentaro Miura')).toBeInTheDocument();

    // E os volumes trazidos pela API agora estão disponíveis no toggle
    const toggleButton = screen.getByRole('button', { name: /ver volumes do mangá/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText('Berserk - Volume 1')).toBeInTheDocument();
    expect(screen.getByText('Berserk - Volume 2')).toBeInTheDocument();

    apiFetchSpy.mockRestore();
  });

  it('preserva os dados da busca mesmo quando a chamada complementar da API falha', async () => {
    const apiFetchSpy = vi.spyOn(apiModule, 'apiFetch').mockRejectedValueOnce(new Error('Network error'));

    render(
      <ComicDetailsModal comic={mockManga} isOpen={true} onClose={vi.fn()} onAdd={vi.fn()} />
    );

    // O título e dados devem permanecer visíveis e não sumir
    expect(screen.getByText('Berserk')).toBeInTheDocument();
    expect(screen.getByText('Mangá')).toBeInTheDocument();

    await waitFor(() => {
      expect(apiFetchSpy).toHaveBeenCalled();
    });

    expect(screen.getByText('Berserk')).toBeInTheDocument();
    expect(screen.getByText('Kentaro Miura')).toBeInTheDocument();
    expect(screen.getByText(/A jornada sombria de Guts/i)).toBeInTheDocument();

    apiFetchSpy.mockRestore();
  });
});
