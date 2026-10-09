import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrivacySettingsPanel } from '../../../src/components/privacy/PrivacySettingsPanel';
import { useAuth } from '../../../src/hooks/useAuth';
import { usePrivacy } from '../../../src/hooks/usePrivacy';

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../src/hooks/usePrivacy', () => ({
  usePrivacy: vi.fn(),
}));

describe('Componente PrivacySettingsPanel (Painel de Privacidade e Direitos LGPD)', () => {
  const mockSignOut = vi.fn();
  const mockFetchSettings = vi.fn();
  const mockUpdateSettings = vi.fn();
  const mockFetchConnections = vi.fn();
  const mockRevokeConnection = vi.fn();
  const mockExportData = vi.fn();
  const mockDeleteAccount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      signOut: mockSignOut,
    });

    (usePrivacy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      settings: {
        activityVisibility: 'friends',
        discoverableByEmail: false,
      },
      connections: [
        {
          id: 'grant-1',
          clientId: 'claude',
          createdAt: '2026-10-09T10:00:00Z',
          expiresAt: '2026-11-09T10:00:00Z',
        },
      ],
      loading: false,
      error: null,
      fetchSettings: mockFetchSettings,
      updateSettings: mockUpdateSettings,
      fetchConnections: mockFetchConnections,
      revokeConnection: mockRevokeConnection,
      exportData: mockExportData,
      deleteAccount: mockDeleteAccount,
    });
  });

  it('deve carregar configurações e conexões ao montar', () => {
    render(<PrivacySettingsPanel />);

    expect(mockFetchSettings).toHaveBeenCalledTimes(1);
    expect(mockFetchConnections).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Privacidade & Visibilidade')).toBeInTheDocument();
    expect(screen.getByText('Agentes Conectados (MCP)')).toBeInTheDocument();
    expect(screen.getByText('Seus Dados & Direitos LGPD')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
  });

  it('deve alternar visibilidade de atividades de amigos para privado', async () => {
    mockUpdateSettings.mockResolvedValueOnce({
      activityVisibility: 'private',
      discoverableByEmail: false,
    });

    render(<PrivacySettingsPanel />);

    const toggleBtn = screen.getByRole('button', { name: /Alternar compartilhamento no feed/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ activityVisibility: 'private' });
    });

    await waitFor(() => {
      expect(screen.getByText(/privadas e não aparecerão no feed/i)).toBeInTheDocument();
    });
  });

  it('deve alternar a busca por e-mail quando o botão correspondente for clicado', async () => {
    mockUpdateSettings.mockResolvedValueOnce({
      activityVisibility: 'friends',
      discoverableByEmail: true,
    });

    render(<PrivacySettingsPanel />);

    const toggleEmailBtn = screen.getByRole('button', { name: /Alternar busca por e-mail/i });
    fireEvent.click(toggleEmailBtn);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ discoverableByEmail: true });
    });

    await waitFor(() => {
      expect(screen.getByText(/podem encontrar seu perfil pelo seu e-mail/i)).toBeInTheDocument();
    });
  });

  it('deve permitir revogar o acesso de um agente MCP conectado', async () => {
    mockRevokeConnection.mockResolvedValueOnce(true);

    render(<PrivacySettingsPanel />);

    const revokeBtn = screen.getByRole('button', { name: /Revogar acesso do agente claude/i });
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(mockRevokeConnection).toHaveBeenCalledWith('grant-1');
    });

    await waitFor(() => {
      expect(screen.getByText(/revogado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('deve acionar exportData ao clicar no botão de baixar dados (Art. 18 LGPD)', async () => {
    mockExportData.mockResolvedValueOnce(undefined);

    render(<PrivacySettingsPanel />);

    const exportBtn = screen.getByRole('button', { name: /Baixar todos os meus dados em formato JSON/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Arquivo com seus dados pessoais gerado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('deve abrir o modal de exclusão e focar inicialmente no botão de cancelamento (segurança D-Pad)', async () => {
    render(<PrivacySettingsPanel />);

    const openDeleteBtn = screen.getByRole('button', { name: /Abrir modal para excluir conta/i });
    fireEvent.click(openDeleteBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Excluir Conta Definitivamente?')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /Cancelar exclusão da conta/i });
    expect(cancelBtn).toBeInTheDocument();

    // Fecha o modal ao clicar em cancelar
    fireEvent.click(cancelBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve executar deleteAccount e signOut ao confirmar exclusão definitiva', async () => {
    mockDeleteAccount.mockResolvedValueOnce(true);

    render(<PrivacySettingsPanel />);

    const openDeleteBtn = screen.getByRole('button', { name: /Abrir modal para excluir conta/i });
    fireEvent.click(openDeleteBtn);

    const confirmDeleteBtn = screen.getByRole('button', { name: /Confirmar exclusão definitiva da conta/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
