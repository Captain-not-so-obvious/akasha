import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComicRecommendationRail } from '../../../src/components/recommendations/ComicRecommendationRail';
import * as useComicRecsModule from '../../../src/hooks/useComicRecommendations';

vi.mock('../../../src/hooks/useComicRecommendations', () => ({
  useComicRecommendations: vi.fn(),
}));

describe('ComicRecommendationRail Component', () => {
  const mockFetchRecommendations = vi.fn();
  const mockSelectComic = vi.fn();
  const mockQuickAdd = vi.fn();

  const mockComicRec = {
    id: 'cv-4050-18233',
    title: 'Batman: The Long Halloween',
    type: 'comic' as const,
    scope: 'saga' as const,
    coverUrl: 'https://comicvine.gamespot.com/cover.jpg',
    releaseYear: 1996,
    publisher: 'DC Comics',
    creators: ['Jeph Loeb', 'Tim Sale'],
    genres: ['Mistério', 'Super-herói'],
    issueCount: 13,
    score: 95,
    reason: 'Porque você leu Batman: Ano Um',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useComicRecsModule.useComicRecommendations).mockReturnValue({
      recommendations: [mockComicRec],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });
  });

  it('deve renderizar o título do trilho e o card da saga recomendada', () => {
    render(<ComicRecommendationRail onSelectComic={mockSelectComic} onQuickAdd={mockQuickAdd} />);

    expect(screen.getByText('Sagas & Mangás Sugeridos')).toBeInTheDocument();
    expect(screen.getByText('Batman: The Long Halloween')).toBeInTheDocument();
    expect(screen.getByText(/Jeph Loeb, Tim Sale/i)).toBeInTheDocument();
    expect(screen.getByText(/Porque você leu Batman: Ano Um/i)).toBeInTheDocument();
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Quadrinhos')).toBeInTheDocument();
    expect(screen.getByText('Mangás & Manhwas')).toBeInTheDocument();
  });

  it('deve disparar fetchRecommendations ao alternar abas de filtro', () => {
    render(<ComicRecommendationRail onSelectComic={mockSelectComic} onQuickAdd={mockQuickAdd} />);

    const mangaTab = screen.getByRole('button', { name: 'Mangás & Manhwas' });
    fireEvent.click(mangaTab);

    expect(mockFetchRecommendations).toHaveBeenCalledWith({ limit: 14, type: 'manga' });
  });

  it('deve disparar onSelectComic ao clicar no card da saga', () => {
    render(<ComicRecommendationRail onSelectComic={mockSelectComic} onQuickAdd={mockQuickAdd} />);

    const card = screen.getByRole('button', { name: /batman: the long halloween \(saga\)/i });
    fireEvent.click(card);

    expect(mockSelectComic).toHaveBeenCalledWith(mockComicRec);
  });

  it('deve disparar onQuickAdd ao clicar no botão de adicionar à estante', () => {
    render(<ComicRecommendationRail onSelectComic={mockSelectComic} onQuickAdd={mockQuickAdd} />);

    const quickAddBtn = screen.getByRole('button', { name: /\+ quero ler/i });
    fireEvent.click(quickAddBtn);

    expect(mockQuickAdd).toHaveBeenCalledWith(mockComicRec);
  });

  it('não deve renderizar nada se não houver recomendações e não estiver carregando', () => {
    vi.mocked(useComicRecsModule.useComicRecommendations).mockReturnValue({
      recommendations: [],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });

    const { container } = render(
      <ComicRecommendationRail onSelectComic={mockSelectComic} onQuickAdd={mockQuickAdd} />
    );

    expect(container.firstChild).toBeNull();
  });
});
