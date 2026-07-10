import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RatingModal } from './RatingModal';

describe('RatingModal', () => {
  it('não deve renderizar se isOpen for false', () => {
    const { container } = render(
      <RatingModal isOpen={false} onClose={() => {}} onSubmit={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar 5 estrelas e disparar onSubmit ao clicar', () => {
    const handleSubmit = vi.fn();
    const handleClose = vi.fn();
    
    render(
      <RatingModal isOpen={true} onClose={handleClose} onSubmit={handleSubmit} />
    );

    const buttons = screen.getAllByRole('button');
    // Temos 5 estrelas + 1 botão de fechar = 6 botões
    expect(buttons).toHaveLength(6);

    // Clica na 3ª estrela (índice 3, pois o botão 0 é o de fechar)
    fireEvent.click(buttons[3]);

    expect(handleSubmit).toHaveBeenCalledWith(3);
    expect(handleClose).toHaveBeenCalled();
  });
});
