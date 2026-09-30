import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookRecommendationRail } from '../../../src/components/recommendations/BookRecommendationRail';
import * as useBookRecsModule from '../../../src/hooks/useBookRecommendations';

vi.mock('../../../src/hooks/useBookRecommendations', () => ({
  useBookRecommendations: vi.fn(),
}));

describe('BookRecommendationRail Component', () => {
  const mockFetchRecommendations = vi.fn();
  const mockSelectBook = vi.fn();
  const mockQuickAdd = vi.fn();

  const mockBookRec = {
    id: 'vol-bras-cubas',
    title: 'Memórias Póstumas de Brás Cubas',
    authors: ['Machado de Assis'],
    coverUrl: 'https://books.google.com/cover.jpg',
    releaseYear: 1881,
    categories: ['Ficção', 'Clássicos'],
    pageCount: 224,
    score: 95,
    reason: 'Porque você apreciou obras de Machado de Assis',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBookRecsModule.useBookRecommendations).mockReturnValue({
      recommendations: [mockBookRec],
      isLoading: false,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });
  });

  it('deve renderizar o título do trilho e o card do livro recomendado', () => {
    render(<BookRecommendationRail onSelectBook={mockSelectBook} onQuickAdd={mockQuickAdd} />);

    expect(screen.getByText('Akasha Sugere para Ler')).toBeInTheDocument();
    expect(screen.getByText('Memórias Póstumas de Brás Cubas')).toBeInTheDocument();
    expect(screen.getByText('Machado de Assis')).toBeInTheDocument();
    expect(screen.getByText(/Porque você apreciou obras de Machado de Assis/i)).toBeInTheDocument();
  });

  it('deve disparar onSelectBook ao clicar no card do livro', () => {
    render(<BookRecommendationRail onSelectBook={mockSelectBook} onQuickAdd={mockQuickAdd} />);

    const card = screen.getByRole('button', { name: /^Livro recomendado: Memórias Póstumas/i });
    fireEvent.click(card);

    expect(mockSelectBook).toHaveBeenCalledWith(mockBookRec);
  });

  it('deve disparar onQuickAdd ao clicar no botão de adicionar à estante', () => {
    render(<BookRecommendationRail onSelectBook={mockSelectBook} onQuickAdd={mockQuickAdd} />);

    const quickAddBtn = screen.getByRole('button', { name: /^Adicionar Memórias Póstumas/i });
    fireEvent.click(quickAddBtn);

    expect(mockQuickAdd).toHaveBeenCalledWith(mockBookRec);
  });

  it('deve possuir tabIndex={0} para acessibilidade por controle remoto no Android TV', () => {
    render(<BookRecommendationRail onSelectBook={mockSelectBook} onQuickAdd={mockQuickAdd} />);

    const card = screen.getByRole('button', { name: /^Livro recomendado: Memórias Póstumas/i });
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('deve renderizar o ThematicLoader quando estiver carregando recomendações de livros', () => {
    vi.mocked(useBookRecsModule.useBookRecommendations).mockReturnValue({
      recommendations: [],
      isLoading: true,
      error: null,
      fetchRecommendations: mockFetchRecommendations,
    });

    render(<BookRecommendationRail onSelectBook={mockSelectBook} onQuickAdd={mockQuickAdd} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('spinning-circle')).toBeInTheDocument();
    expect(screen.getByText('Recomendações Literárias')).toBeInTheDocument();
  });
});

