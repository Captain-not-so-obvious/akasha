import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrivacyPolicy } from '../../src/pages/PrivacyPolicy';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Página PrivacyPolicy (Política de Privacidade LGPD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar os elementos centrais de conformidade com a LGPD', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );

    expect(screen.getByText('Política de Privacidade do Akasha')).toBeInTheDocument();
    expect(screen.getByText(/Conformidade com a LGPD/i)).toBeInTheDocument();
    expect(screen.getByText(/Fillipe Moreira/i)).toBeInTheDocument();
    expect(screen.getByText(/fillipemoreira979@gmail.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Transferência Internacional de Dados/i)).toBeInTheDocument();
    expect(screen.getByText(/Oregon, Estados Unidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Seus Direitos como Titular/i)).toBeInTheDocument();
  });

  it('deve acionar navigate(-1) ao clicar no botão de voltar', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );

    const backButton = screen.getByRole('button', { name: /Voltar para a tela anterior/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
