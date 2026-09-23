import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AvatarPickerModal } from '../../../src/components/profile/AvatarPickerModal';

describe('Componente AvatarPickerModal (Personalização de Foto)', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectAvatar = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não deve renderizar quando isOpen for false', () => {
    const { container } = render(
      <AvatarPickerModal
        isOpen={false}
        onClose={mockOnClose}
        onSelectAvatar={mockOnSelectAvatar}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar avatares temáticos e opção de upload quando isOpen for true', () => {
    render(
      <AvatarPickerModal
        isOpen={true}
        onClose={mockOnClose}
        defaultOAuthAvatar="https://googleusercontent.com/avatar.jpg"
        onSelectAvatar={mockOnSelectAvatar}
      />
    );

    expect(screen.getByText('Foto de Perfil')).toBeInTheDocument();
    expect(screen.getByText('Oráculo')).toBeInTheDocument();
    expect(screen.getByText('Viajante')).toBeInTheDocument();
    expect(screen.getByText(/Escolher Imagem do Computador ou Celular/i)).toBeInTheDocument();
    expect(screen.getByText(/Restaurar foto original da conta Google/i)).toBeInTheDocument();
  });

  it('deve selecionar um avatar temático ao clicar', async () => {
    mockOnSelectAvatar.mockResolvedValueOnce(undefined);

    render(
      <AvatarPickerModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectAvatar={mockOnSelectAvatar}
      />
    );

    const oracleBtn = screen.getByTitle('Oráculo');
    fireEvent.click(oracleBtn);

    await waitFor(() => {
      expect(mockOnSelectAvatar).toHaveBeenCalledWith(
        expect.stringContaining('AkashaOracle')
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('deve permitir restaurar a foto padrão da conta Google', async () => {
    mockOnSelectAvatar.mockResolvedValueOnce(undefined);

    render(
      <AvatarPickerModal
        isOpen={true}
        onClose={mockOnClose}
        defaultOAuthAvatar="https://googleusercontent.com/minha-foto.jpg"
        onSelectAvatar={mockOnSelectAvatar}
      />
    );

    const restoreBtn = screen.getByText(/Restaurar foto original da conta Google/i);
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(mockOnSelectAvatar).toHaveBeenCalledWith('https://googleusercontent.com/minha-foto.jpg');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('deve renderizar botão para escolher imagem do computador ou celular', () => {
    render(
      <AvatarPickerModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectAvatar={mockOnSelectAvatar}
      />
    );

    expect(screen.getByText(/Escolher Imagem do Computador ou Celular/i)).toBeInTheDocument();
  });
});
