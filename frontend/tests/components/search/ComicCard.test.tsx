import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ComicCard } from '../../../src/components/search/ComicCard';
import type { ComicDetails } from '../../../src/types/comic';

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
};

const mockManga: ComicDetails = {
  id: 'al-30002',
  title: 'Berserk',
  originalTitle: 'ベルセルク',
  type: 'manga',
  scope: 'volume',
  coverUrl: 'https://anilist.co/berserk.jpg',
  releaseYear: 1989,
  publisher: 'Hakusensha',
  creators: ['Kentarou Miura'],
  genres: ['Dark Fantasy', 'Ação', 'Terror'],
  volumeCount: 41,
  chapterCount: 364,
  description: 'A jornada de Guts com sua espada matadora de dragões.',
};

describe('Componente ComicCard', () => {
  it('renderiza título, criadores, editora, contagem de edições e ano de lançamento', () => {
    render(<ComicCard comic={mockComic} />);

    expect(screen.getByText('Batman: O Longo Dia das Bruxas')).toBeInTheDocument();
    expect(screen.getByText(/Jeph Loeb, Tim Sale/i)).toBeInTheDocument();
    expect(screen.getByText('DC Comics')).toBeInTheDocument();
    expect(screen.getByText('1996')).toBeInTheDocument();
    expect(screen.getByText(/13 edições/i)).toBeInTheDocument();
    expect(screen.getByText('Saga / HQ')).toBeInTheDocument();
  });

  it('renderiza tipo e contagem de volumes para Mangás', () => {
    render(<ComicCard comic={mockManga} />);

    expect(screen.getByText('Berserk')).toBeInTheDocument();
    expect(screen.getByText(/Kentarou Miura/i)).toBeInTheDocument();
    expect(screen.getByText('Hakusensha')).toBeInTheDocument();
    expect(screen.getByText('1989')).toBeInTheDocument();
    expect(screen.getByText(/41 volumes/i)).toBeInTheDocument();
    expect(screen.getByText('Mangá')).toBeInTheDocument();
  });

  it('possui tabIndex={0} e dispara onSelect ao clicar e ao pressionar Enter (Android TV)', () => {
    const onSelect = vi.fn();
    render(<ComicCard comic={mockComic} onSelect={onSelect} />);

    const card = screen.getByRole('button', { name: /batman: o longo dia das bruxas/i });
    expect(card).toHaveAttribute('tabIndex', '0');

    // Clique com mouse / touch
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockComic);

    // D-Pad / Enter no controle remoto
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);

    // D-Pad / Espaço no controle remoto
    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('exibe badge "Na Biblioteca" quando isInLibrary for true', () => {
    render(<ComicCard comic={mockComic} isInLibrary={true} />);
    expect(screen.getByText('Na Biblioteca')).toBeInTheDocument();
  });
});
