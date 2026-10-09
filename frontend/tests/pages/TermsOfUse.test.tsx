import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TermsOfUse } from '../../src/pages/TermsOfUse';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Página TermsOfUse (Termos de Uso)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar as seções principais dos Termos de Uso', () => {
    render(
      <MemoryRouter>
        <TermsOfUse />
      </MemoryRouter>
    );

    expect(screen.getByText('Termos de Uso do Akasha')).toBeInTheDocument();
    expect(screen.getByText(/Contrato de Utilização do Serviço/i)).toBeInTheDocument();
    expect(screen.getByText(/Aceitação dos Termos/i)).toBeInTheDocument();
    expect(screen.getByText(/Integração com Agentes de Inteligência Artificial/i)).toBeInTheDocument();
    expect(screen.getByText(/Rescisão e Encerramento de Conta/i)).toBeInTheDocument();
  });

  it('deve acionar navigate(-1) ao clicar no botão de voltar', () => {
    render(
      <MemoryRouter>
        <TermsOfUse />
      </MemoryRouter>
    );

    const backButton = screen.getByRole('button', { name: /Voltar para a tela anterior/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
