import React, { useEffect, useState, useRef } from 'react';
import { usePrivacy } from '../../hooks/usePrivacy';
import { useAuth } from '../../hooks/useAuth';
import { GlassPanel } from '../ui/GlassPanel';
import {
  Shield,
  Eye,
  Mail,
  Cpu,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

export const PrivacySettingsPanel: React.FC = () => {
  const { signOut } = useAuth();
  const {
    settings,
    connections,
    loading,
    error,
    fetchSettings,
    updateSettings,
    fetchConnections,
    revokeConnection,
    exportData,
    deleteAccount,
  } = usePrivacy();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Ref para focar automaticamente no botão "Cancelar" ao abrir o modal (proteção D-Pad Android TV)
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchConnections();
  }, [fetchSettings, fetchConnections]);

  useEffect(() => {
    if (showDeleteModal) {
      setTimeout(() => {
        cancelDeleteButtonRef.current?.focus();
      }, 50);
    }
  }, [showDeleteModal]);

  const handleToggleVisibility = async () => {
    if (!settings) return;
    const next = settings.activityVisibility === 'friends' ? 'private' : 'friends';
    const updated = await updateSettings({ activityVisibility: next });
    if (updated) {
      setFeedbackMsg(
        next === 'private'
          ? 'Suas atividades agora são privadas e não aparecerão no feed dos amigos.'
          : 'Suas atividades agora serão compartilhadas no feed dos amigos.'
      );
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleToggleDiscoverable = async () => {
    if (!settings) return;
    const next = !settings.discoverableByEmail;
    const updated = await updateSettings({ discoverableByEmail: next });
    if (updated) {
      setFeedbackMsg(
        next
          ? 'Outros viajantes agora podem encontrar seu perfil pelo seu e-mail.'
          : 'Seu perfil agora só pode ser localizado por @usuário ou Código de Amigo.'
      );
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleRevoke = async (id: string, clientName: string) => {
    const success = await revokeConnection(id);
    if (success) {
      setFeedbackMsg(`Acesso do agente ${clientName} revogado com sucesso.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportData();
      setFeedbackMsg('Arquivo com seus dados pessoais gerado com sucesso!');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteAccount();
      if (success) {
        await signOut();
        window.location.href = '/login';
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-outfit">
      {/* Mensagem de Feedback */}
      {feedbackMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300 flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            tabIndex={0}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Grid de Configurações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Painel 1: Privacidade e Visibilidade Social */}
        <GlassPanel className="p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-200 border-b border-white/5 pb-3">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="font-cinzel text-base font-semibold tracking-wider">
              Privacidade & Visibilidade
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Toggle 1: Visibilidade de Atividades */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                  <span>Compartilhar no Feed de Amigos</span>
                </div>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  Permite que amigos confirmados visualizem suas novas notas e resenhas no feed.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={loading || !settings}
                tabIndex={0}
                aria-label="Alternar compartilhamento no feed"
                className={`tv-focus-glow relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings?.activityVisibility === 'friends' ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings?.activityVisibility === 'friends' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Descoberta por e-mail */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <Mail className="w-3.5 h-3.5 text-amber-300" />
                  <span>Localizável por E-mail</span>
                </div>
                <p className="text-[11px] opacity-70 leading-relaxed">
                  Se desativado, amigos só podem enviar pedidos pelo seu Código de Amigo ou @usuário.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleDiscoverable}
                disabled={loading || !settings}
                tabIndex={0}
                aria-label="Alternar busca por e-mail"
                className={`tv-focus-glow relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings?.discoverableByEmail ? 'bg-amber-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings?.discoverableByEmail ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </GlassPanel>

        {/* Painel 2: Conexões de IA & Agentes MCP */}
        <GlassPanel className="p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-200 border-b border-white/5 pb-3">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h3 className="font-cinzel text-base font-semibold tracking-wider">
              Agentes Conectados (MCP)
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            {connections.length === 0 ? (
              <p className="p-4 rounded-xl bg-black/20 border border-white/5 text-center text-white/50 text-[11px]">
                Nenhum agente de IA (Google Spark, Claude) conectado no momento.
              </p>
            ) : (
              connections.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/20 border border-white/5"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white capitalize">{c.clientId}</span>
                    <p className="text-[10px] text-white/50">
                      Conectado em {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRevoke(c.id, c.clientId)}
                    tabIndex={0}
                    aria-label={`Revogar acesso do agente ${c.clientId}`}
                    className="tv-focus-glow inline-flex items-center gap-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <span>Revogar</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Painel 3: Gestão de Dados e Direitos do Titular (Art. 18 LGPD) */}
      <GlassPanel className="p-5 md:p-6 space-y-4 border border-white/10">
        <h3 className="font-cinzel text-base font-semibold text-[var(--color-caramelo-claro)]">
          Seus Dados & Direitos LGPD
        </h3>
        <p className="text-xs opacity-70 leading-relaxed max-w-2xl">
          Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode solicitar a portabilidade completa de suas informações ou o expurgo definitivo de sua conta.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          {/* Botão Exportar Dados */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            tabIndex={0}
            aria-label="Baixar todos os meus dados em formato JSON"
            className="tv-focus-glow inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-4 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>{isExporting ? 'Exportando...' : 'Baixar Meus Dados (JSON)'}</span>
          </button>

          {/* Botão Excluir Conta */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            tabIndex={0}
            aria-label="Abrir modal para excluir conta e dados pessoais"
            className="tv-focus-glow inline-flex items-center gap-2 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Minha Conta</span>
          </button>
        </div>
      </GlassPanel>

      {/* Modal de Confirmação de Exclusão (Acessível para TV e Touch) */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <GlassPanel className="w-full max-w-md p-6 space-y-5 text-center border border-red-500/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h4 id="modal-delete-title" className="font-cinzel text-xl font-bold text-red-300">
                Excluir Conta Definitivamente?
              </h4>
              <p className="font-outfit text-xs text-white/80 leading-relaxed">
                Esta ação é <strong>irreversível</strong>. Todo o seu acervo cultural, avaliações, resenhas, amizades e histórico serão excluídos imediatamente dos nossos servidores em conformidade com o Art. 18 da LGPD.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 font-outfit">
              {/* Botão Cancelar recebe o foco inicial para evitar cliques acidentais na TV */}
              <button
                ref={cancelDeleteButtonRef}
                type="button"
                onClick={() => setShowDeleteModal(false)}
                tabIndex={0}
                aria-label="Cancelar exclusão da conta"
                className="tv-focus-glow w-full rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Cancelar e Manter Minha Conta
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                tabIndex={0}
                aria-label="Confirmar exclusão definitiva da conta"
                className="tv-focus-glow w-full rounded-xl bg-red-600 hover:bg-red-500 px-4 py-3 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Meus Dados Agora'}
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
};
