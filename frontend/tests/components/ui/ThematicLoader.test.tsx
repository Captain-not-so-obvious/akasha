import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThematicLoader, DOMAIN_PHRASES } from '../../../src/components/ui/ThematicLoader';

describe('Componente ThematicLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.clearAllTimers();
    });
    vi.useRealTimers();
  });

  it('deve renderizar o círculo giratório padrão e o role status para acessibilidade', () => {
    render(<ThematicLoader />);

    const statusContainer = screen.getByRole('status');
    expect(statusContainer).toBeInTheDocument();
    expect(statusContainer).toHaveAttribute('aria-live', 'polite');

    const spinner = screen.getByTestId('spinning-circle');
    expect(spinner).toBeInTheDocument();
    expect(spinner.className).toContain('animate-spin');
  });

  it('deve renderizar as frases do domínio de livros incluindo frases solicitadas pelo usuário', () => {
    render(<ThematicLoader domain="book" />);

    // Primeira frase do domínio book
    expect(screen.getByText('Organizando a sua estante...')).toBeInTheDocument();
  });

  it('deve alternar frases periodicamente com animação após o intervalo de tempo', () => {
    render(<ThematicLoader domain="book" intervalMs={2000} />);

    expect(screen.getByText(DOMAIN_PHRASES.book[0])).toBeInTheDocument();

    // Avança o timer para disparar o fade e troca de frase
    act(() => {
      vi.advanceTimersByTime(2000); // Dispara início do fade
      vi.advanceTimersByTime(250);  // Conclui transição de troca de frase
    });

    expect(screen.getByText(DOMAIN_PHRASES.book[1])).toBeInTheDocument();

    // Avança mais uma vez
    act(() => {
      vi.advanceTimersByTime(2000);
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText(DOMAIN_PHRASES.book[2])).toBeInTheDocument();
  });

  it('deve suportar lista personalizada de frases', () => {
    const customPhrases = ['Carregando dados molares...', 'Quase pronto!'];
    render(<ThematicLoader phrases={customPhrases} intervalMs={1500} />);

    expect(screen.getByText('Carregando dados molares...')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText('Quase pronto!')).toBeInTheDocument();
  });

  it('deve exibir subtexto quando fornecido', () => {
    render(<ThematicLoader domain="movie" subtext="Recomendações Cinematográficas" />);

    expect(screen.getByTestId('thematic-subtext')).toHaveTextContent('Recomendações Cinematográficas');
  });

  it('deve aplicar classes correspondentes aos tamanhos sm, md e lg', () => {
    const { rerender } = render(<ThematicLoader size="sm" />);
    expect(screen.getByTestId('spinning-circle').className).toContain('w-6');

    rerender(<ThematicLoader size="lg" />);
    expect(screen.getByTestId('spinning-circle').className).toContain('w-12');
  });
});
