import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentGate } from '../../../src/components/privacy/ConsentGate';
import { useAuth } from '../../../src/hooks/useAuth';
import { usePrivacy } from '../../../src/hooks/usePrivacy';

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../src/hooks/usePrivacy', () => ({
  usePrivacy: vi.fn(),
}));

describe('Componente ConsentGate (Bloqueio de Consentimento LGPD)', () => {
  const mockSignOut = vi.fn();
  const mockCheckPendingConsents = vi.fn();
  const mockAcceptConsent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 'user-123', email: 'viajante@akasha.com' },
      signOut: mockSignOut,
    });

    (usePrivacy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      checkPendingConsents: mockCheckPendingConsents,
      acceptConsent: mockAcceptConsent,
    });
  });

  it('deve renderizar o conteúdo protegido diretamente se o usuário não estiver autenticado', async () => {
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      signOut: mockSignOut,
    });

    render(
      <ConsentGate>
        <div data-testid="protected-content">Conteúdo do App</div>
      </ConsentGate>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText(/Atualização de Privacidade & Termos/i)).not.toBeInTheDocument();
  });

  it('deve renderizar o conteúdo protegido se não existirem consentimentos pendentes', async () => {
    mockCheckPendingConsents.mockResolvedValueOnce([]);

    render(
      <ConsentGate>
        <div data-testid="protected-content">Conteúdo do App</div>
      </ConsentGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Atualização de Privacidade & Termos/i)).not.toBeInTheDocument();
  });

  it('deve exibir o modal bloqueante quando houver termos ou privacidade pendentes', async () => {
    mockCheckPendingConsents.mockResolvedValueOnce(['terms', 'privacy']);

    render(
      <ConsentGate>
        <div data-testid="protected-content">Conteúdo do App</div>
      </ConsentGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/Atualização de Privacidade & Termos/i)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aceitar e Continuar/i })).toBeDisabled();
  });

  it('deve habilitar o botão de aceite após marcar o checkbox e processar o consentimento', async () => {
    mockCheckPendingConsents.mockResolvedValueOnce(['terms', 'privacy']);
    mockAcceptConsent.mockResolvedValue(true);

    render(
      <ConsentGate>
        <div data-testid="protected-content">Conteúdo do App</div>
      </ConsentGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/Atualização de Privacidade & Termos/i)).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const acceptBtn = screen.getByRole('button', { name: /Aceitar e Continuar/i });
    expect(acceptBtn).not.toBeDisabled();

    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(mockAcceptConsent).toHaveBeenCalledWith('terms', expect.any(String));
      expect(mockAcceptConsent).toHaveBeenCalledWith('privacy', expect.any(String));
    });

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('deve invocar signOut ao clicar em sair da conta', async () => {
    mockCheckPendingConsents.mockResolvedValueOnce(['terms']);

    render(
      <ConsentGate>
        <div data-testid="protected-content">Conteúdo do App</div>
      </ConsentGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/Atualização de Privacidade & Termos/i)).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole('button', { name: /Sair da Conta/i });
    fireEvent.click(logoutBtn);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
