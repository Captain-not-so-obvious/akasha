import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RatingModal, MAX_REVIEW_LENGTH } from '../../../src/components/ui/RatingModal';

describe('RatingModal', () => {
  it('deve ter a constante MAX_REVIEW_LENGTH configurada como 300', () => {
    expect(MAX_REVIEW_LENGTH).toBe(300);
  });

  it('não deve renderizar se isOpen for false', () => {
    const { container } = render(
      <RatingModal isOpen={false} onClose={() => {}} onSubmit={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar 5 estrelas interativas com suporte a tabIndex={0} para Android TV', () => {
    render(<RatingModal isOpen={true} onClose={() => {}} onSubmit={() => {}} />);

    const starButtons = screen.getAllByRole('button', { name: /estrela/i });
    expect(starButtons).toHaveLength(5);
    starButtons.forEach((btn) => {
      expect(btn).toHaveAttribute('tabindex', '0');
    });

    const textarea = screen.getByPlaceholderText(/O que você achou dessa obra\?/i);
    expect(textarea).toHaveAttribute('tabindex', '0');
    expect(textarea).toHaveAttribute('maxLength', String(MAX_REVIEW_LENGTH));

    const saveButton = screen.getByRole('button', { name: /Salvar Avaliação/i });
    expect(saveButton).toBeDisabled();
  });

  it('deve permitir selecionar estrelas e salvar avaliação sem opinião opcional', () => {
    const handleSubmit = vi.fn();
    const handleClose = vi.fn();

    render(
      <RatingModal isOpen={true} onClose={handleClose} onSubmit={handleSubmit} />
    );

    const star4 = screen.getByRole('button', { name: '4 estrelas' });
    fireEvent.click(star4);

    const saveButton = screen.getByRole('button', { name: /Salvar Avaliação/i });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    expect(handleSubmit).toHaveBeenCalledWith(4, undefined);
    expect(handleClose).toHaveBeenCalled();
  });

  it('deve permitir escrever uma opinião e submeter junto com a nota', () => {
    const handleSubmit = vi.fn();
    const handleClose = vi.fn();

    render(
      <RatingModal isOpen={true} onClose={handleClose} onSubmit={handleSubmit} />
    );

    // Seleciona 5 estrelas
    const star5 = screen.getByRole('button', { name: '5 estrelas' });
    fireEvent.click(star5);

    // Digita uma opinião no textarea
    const textarea = screen.getByPlaceholderText(/O que você achou dessa obra\?/i);
    fireEvent.change(textarea, { target: { value: 'Uma obra-prima incontestável!' } });

    // Verifica contador de caracteres
    expect(screen.getByText(`29/${MAX_REVIEW_LENGTH}`)).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Salvar Avaliação/i });
    fireEvent.click(saveButton);

    expect(handleSubmit).toHaveBeenCalledWith(5, 'Uma obra-prima incontestável!');
    expect(handleClose).toHaveBeenCalled();
  });

  it('deve limitar o texto da opinião a 300 caracteres (MAX_REVIEW_LENGTH) e truncar excedente', () => {
    const handleSubmit = vi.fn();
    render(<RatingModal isOpen={true} onClose={() => {}} onSubmit={handleSubmit} />);

    const star5 = screen.getByRole('button', { name: '5 estrelas' });
    fireEvent.click(star5);

    const textarea = screen.getByPlaceholderText(/O que você achou dessa obra\?/i) as HTMLTextAreaElement;
    expect(textarea).toHaveAttribute('maxLength', '300');

    // Tenta inserir 350 caracteres
    const excessText = 'A'.repeat(350);
    fireEvent.change(textarea, { target: { value: excessText } });

    // O valor no textarea deve ser truncado em exatamente 300 caracteres
    expect(textarea.value).toHaveLength(MAX_REVIEW_LENGTH);
    expect(textarea.value).toBe('A'.repeat(300));
    expect(screen.getByText('300/300')).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Salvar Avaliação/i });
    fireEvent.click(saveButton);

    expect(handleSubmit).toHaveBeenCalledWith(5, 'A'.repeat(300));
  });

  it('deve carregar initialRating e initialReview quando fornecidos', () => {
    const handleSubmit = vi.fn();
    const handleClose = vi.fn();

    render(
      <RatingModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        initialRating={3}
        initialReview="Gostei, mas o final foi corrido."
      />
    );

    const textarea = screen.getByPlaceholderText(/O que você achou dessa obra\?/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Gostei, mas o final foi corrido.');

    const saveButton = screen.getByRole('button', { name: /Salvar Avaliação/i });
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);
    expect(handleSubmit).toHaveBeenCalledWith(3, 'Gostei, mas o final foi corrido.');
  });
});
