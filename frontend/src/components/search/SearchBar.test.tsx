import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from './SearchBar';

describe('Componente SearchBar', () => {
  const defaultProps = {
    query: '',
    mediaType: 'movie' as const,
    onQueryChange: vi.fn(),
    onMediaTypeChange: vi.fn(),
  };

  it('deve renderizar o input de busca e os botões de toggle', () => {
    render(<SearchBar {...defaultProps} />);

    expect(screen.getByPlaceholderText(/buscar filmes/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /filmes/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /séries/i })).toBeInTheDocument();
  });

  it('deve marcar o botão "Filmes" como ativo quando mediaType é "movie"', () => {
    render(<SearchBar {...defaultProps} mediaType="movie" />);
    expect(screen.getByRole('radio', { name: /filmes/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /séries/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('deve marcar o botão "Séries" como ativo quando mediaType é "tv"', () => {
    render(<SearchBar {...defaultProps} mediaType="tv" />);
    expect(screen.getByRole('radio', { name: /séries/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /filmes/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('chama onQueryChange ao digitar no input', () => {
    const onQueryChange = vi.fn();
    render(<SearchBar {...defaultProps} onQueryChange={onQueryChange} />);

    const input = screen.getByPlaceholderText(/buscar filmes/i);
    fireEvent.change(input, { target: { value: 'batman' } });

    expect(onQueryChange).toHaveBeenCalledWith('batman');
  });

  it('chama onMediaTypeChange ao clicar no toggle "Séries"', () => {
    const onMediaTypeChange = vi.fn();
    render(<SearchBar {...defaultProps} onMediaTypeChange={onMediaTypeChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /séries/i }));
    expect(onMediaTypeChange).toHaveBeenCalledWith('tv');
  });

  it('exibe botão de limpar quando há query e chama onQueryChange com string vazia ao clicar', () => {
    const onQueryChange = vi.fn();
    render(<SearchBar {...defaultProps} query="batman" onQueryChange={onQueryChange} />);

    const clearButton = screen.getByRole('button', { name: /limpar busca/i });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(onQueryChange).toHaveBeenCalledWith('');
  });

  it('não exibe botão de limpar quando a query está vazia', () => {
    render(<SearchBar {...defaultProps} query="" />);
    expect(screen.queryByRole('button', { name: /limpar busca/i })).not.toBeInTheDocument();
  });
});
