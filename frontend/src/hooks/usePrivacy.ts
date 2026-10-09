import { useState, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import type {
  PrivacySettings,
  McpConnection,
  PendingConsentsResponse,
  UserDataExport,
} from '../types/privacy';

export function usePrivacy() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [pendingConsents, setPendingConsents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/privacy/settings');
      if (!res.ok) throw new Error('Falha ao carregar preferências de privacidade.');
      const data = (await res.json()) as PrivacySettings;
      setSettings(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao consultar privacidade.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<PrivacySettings>) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/privacy/settings', {
        method: 'PATCH',
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error('Falha ao atualizar preferências.');
      const data = (await res.json()) as { settings: PrivacySettings };
      setSettings(data.settings);
      return data.settings;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar privacidade.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/privacy/connections');
      if (!res.ok) throw new Error('Falha ao listar conexões MCP.');
      const data = (await res.json()) as McpConnection[];
      setConnections(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar conexões.';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const revokeConnection = useCallback(async (connectionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/privacy/connections/${connectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao revogar acesso do agente.');
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao revogar conexão.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportData = useCallback(async (): Promise<UserDataExport | null> => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/privacy/export');
      if (!res.ok) throw new Error('Falha ao gerar arquivo de exportação.');
      const data = (await res.json()) as UserDataExport;

      // Dispara download automático do arquivo JSON no navegador
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `akasha-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na exportação de dados.';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/privacy/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'EXCLUIR' }),
      });
      if (!res.ok) throw new Error('Falha ao excluir conta.');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir conta.';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPendingConsents = useCallback(async () => {
    try {
      const res = await apiFetch('/privacy/consent');
      if (!res.ok) return [];
      const data = (await res.json()) as PendingConsentsResponse;
      setPendingConsents(data.pending || []);
      return data.pending || [];
    } catch {
      return [];
    }
  }, []);

  const acceptConsent = useCallback(async (document: 'terms' | 'privacy', version: string) => {
    try {
      const res = await apiFetch('/privacy/consent', {
        method: 'POST',
        body: JSON.stringify({ document, version }),
      });
      if (!res.ok) throw new Error('Falha ao registrar consentimento.');
      setPendingConsents((prev) => prev.filter((d) => d !== document));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    settings,
    connections,
    pendingConsents,
    loading,
    error,
    fetchSettings,
    updateSettings,
    fetchConnections,
    revokeConnection,
    exportData,
    deleteAccount,
    checkPendingConsents,
    acceptConsent,
  };
}
