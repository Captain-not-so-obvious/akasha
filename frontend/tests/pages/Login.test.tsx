import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Login } from '../../src/pages/Login';
import { useAuth } from '../../src/hooks/useAuth';

// Mock do hook de autenticação
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('Componente de Login', () => {
  const mockSignInWithGoogle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: null,
      signInWithGoogle: mockSignInWithGoogle,
    });
  });

  it('deve renderizar a logo do Akasha e o botão de autenticação do Google', () => {
    render(<Login />);
    
    expect(screen.getByText('AKASHA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar com o google/i })).toBeInTheDocument();
  });

  it('deve chamar signInWithGoogle ao clicar no botão de autenticação', () => {
    render(<Login />);
    
    const button = screen.getByRole('button', { name: /entrar com o google/i });
    fireEvent.click(button);
    
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('deve desativar o botão e alterar o texto para "Conectando..." ao disparar a requisição', () => {
    // Retorna uma Promise que não se resolve para podermos validar o estado persistente de carregamento
    mockSignInWithGoogle.mockReturnValue(new Promise(() => {}));

    render(<Login />);
    
    const button = screen.getByRole('button', { name: /entrar com o google/i });
    fireEvent.click(button);
    
    expect(button).toBeDisabled();
    expect(screen.getByText('Conectando...')).toBeInTheDocument();
  });
});
