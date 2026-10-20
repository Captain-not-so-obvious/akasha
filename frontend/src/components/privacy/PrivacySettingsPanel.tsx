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
  X,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
  Terminal,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  getBackendBaseUrl,
  getMcpSseUrl,
  getMcpClaudeConfigJson,
} from '../../utils/mcpUrl';

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
  const [showMcpGuideModal, setShowMcpGuideModal] = useState(false);
  const [copiedField, setCopiedField] = useState<'url' | 'json' | 'spark' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Ref para focar automaticamente no botão "Cancelar" ao abrir os modais (proteção D-Pad Android TV)
  const cancelDeleteButtonRef = useRef<HTMLButtonElement>(null);
  const closeMcpGuideButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (showMcpGuideModal) {
      setTimeout(() => {
        closeMcpGuideButtonRef.current?.focus();
      }, 50);
    }
  }, [showMcpGuideModal]);

  const handleCopy = async (text: string, field: 'url' | 'json' | 'spark') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setFeedbackMsg(
        field === 'json'
          ? 'Configuração JSON copiada! Cole no claude_desktop_config.json ou Cursor.'
          : 'URL copiada para a área de transferência!'
      );
      setTimeout(() => {
        setCopiedField(null);
        setFeedbackMsg(null);
      }, 3500);
    } catch {
      setFeedbackMsg('Não foi possível copiar automaticamente para a área de transferência.');
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

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

  const mcpSseUrl = getMcpSseUrl();
  const mcpClaudeJson = getMcpClaudeConfigJson();
  const backendBaseUrl = getBackendBaseUrl();

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
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-amber-200">
              <Cpu className="w-4 h-4 text-amber-400" />
              <h3 className="font-cinzel text-base font-semibold tracking-wider">
                Agentes Conectados (MCP)
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setShowMcpGuideModal(true)}
              tabIndex={0}
              aria-label="Abrir guia de como conectar agentes de IA"
              className="tv-focus-glow inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Como Conectar</span>
            </button>
          </div>

          {/* Bloco de Integração Rápida (1-Click Copy) */}
          <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-200/90 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Endpoint do Servidor MCP (SSE)
              </span>
              <span className="text-white/40 text-[10px]">Pronto para IA</span>
            </div>

            {/* URL e Botão de Cópia */}
            <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded-lg border border-white/10">
              <code className="flex-1 text-[11px] text-amber-100 font-mono truncate px-1.5 select-all">
                {mcpSseUrl}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(mcpSseUrl, 'url')}
                tabIndex={0}
                title="Copiar URL do Servidor MCP"
                aria-label="Copiar URL do Servidor MCP"
                className="tv-focus-glow inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors cursor-pointer shrink-0"
              >
                {copiedField === 'url' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300 text-[10px]">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-amber-300" />
                    <span className="text-[10px]">Copiar URL</span>
                  </>
                )}
              </button>
            </div>

            {/* Ação Rápida: Copiar Configuração JSON Claude/Cursor */}
            <div className="pt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCopy(mcpClaudeJson, 'json')}
                tabIndex={0}
                aria-label="Copiar configuração JSON para Claude Desktop ou Cursor"
                className="tv-focus-glow flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-caramelo-claro)]/15 hover:bg-[var(--color-caramelo-claro)]/25 text-[var(--color-caramelo-claro)] border border-[var(--color-caramelo-claro)]/30 px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                {copiedField === 'json' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>JSON Copiado!</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Copiar JSON (Claude & Cursor)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Lista de Conexões Ativas */}
          <div className="space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
              Acessos Autorizados
            </span>

            {connections.length === 0 ? (
              <p className="p-3.5 rounded-xl bg-black/20 border border-white/5 text-center text-white/50 text-[11px] leading-relaxed">
                Nenhum agente de IA conectado no momento. Copie a URL ou JSON acima para vincular o Claude Desktop, Google Spark ou Cursor.
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
          <div>
            <h3 className="font-cinzel text-base font-semibold text-[var(--color-caramelo-claro)]">
              Seus Dados & Direitos LGPD
            </h3>
            <p className="text-xs opacity-70 leading-relaxed max-w-xl mt-1">
              Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar a portabilidade de suas informações, o expurgo definitivo ou consultar as salvaguardas da plataforma.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <a
              href="/privacidade"
              tabIndex={0}
              aria-label="Consultar documento integral da Política de Privacidade"
              className="tv-focus-glow inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-amber-300 hover:text-amber-200 transition-colors cursor-pointer min-h-[36px]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Política de Privacidade</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
            <a
              href="/termos"
              tabIndex={0}
              aria-label="Consultar documento integral dos Termos de Uso"
              className="tv-focus-glow inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-amber-300 hover:text-amber-200 transition-colors cursor-pointer min-h-[36px]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Termos de Uso</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {/* Botão Exportar Dados */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            tabIndex={0}
            aria-label="Baixar todos os meus dados em formato JSON"
            className="tv-focus-glow inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-4 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
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
            className="tv-focus-glow inline-flex items-center gap-2 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 px-4 py-2.5 text-xs font-semibold text-red-300 transition-colors cursor-pointer min-h-[44px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Minha Conta</span>
          </button>
        </div>
      </GlassPanel>

      {/* Modal Interativo: Como Conectar Agentes de IA ao Akasha (MCP) */}
      {showMcpGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-mcp-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <GlassPanel className="w-full max-w-xl p-6 md:p-7 space-y-5 border border-amber-500/30 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-200">
                <Cpu className="h-5 w-5 text-amber-400" />
                <h4 id="modal-mcp-title" className="font-cinzel text-lg md:text-xl font-bold">
                  Conectar Agente de IA (MCP)
                </h4>
              </div>
              <button
                ref={closeMcpGuideButtonRef}
                type="button"
                onClick={() => setShowMcpGuideModal(false)}
                tabIndex={0}
                aria-label="Fechar guia de conexão MCP"
                className="tv-focus-glow p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-outfit">
              O Akasha suporta o padrão aberto <strong>Model Context Protocol (MCP)</strong>. Ao conectar seu agente, ele poderá consultar suas recomendações culturais, buscar obras e avaliar filmes ou séries diretamente no chat de IA em seu nome.
            </p>

            <div className="space-y-4 font-outfit text-xs">
              {/* Opção 1: Claude Desktop & Cursor */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300 text-sm flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    Opção 1: Claude Desktop & Cursor
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Mais Fácil
                  </span>
                </div>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  Basta colar este bloco no seu arquivo <code className="text-amber-200 bg-white/5 px-1 py-0.5 rounded">claude_desktop_config.json</code> ou nas configurações de MCP do Cursor:
                </p>

                <div className="relative">
                  <pre className="p-3 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-amber-100 overflow-x-auto select-all">
                    {mcpClaudeJson}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopy(mcpClaudeJson, 'json')}
                    tabIndex={0}
                    aria-label="Copiar JSON de configuração do Claude"
                    className="tv-focus-glow absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-medium transition-colors cursor-pointer"
                  >
                    {copiedField === 'json' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-amber-300" />
                        <span>Copiar JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Opção 2: Google Spark & Clientes OAuth Web */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                <span className="font-semibold text-amber-300 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Opção 2: Google Spark & Agentes Web
                </span>
                <p className="text-white/70 text-[11px] leading-relaxed">
                  No Google Spark ou clientes com descoberta automática OAuth, adicione um novo servidor e insira apenas a URL Base do Akasha:
                </p>

                <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-white/10">
                  <code className="flex-1 text-[11px] text-amber-100 font-mono truncate select-all">
                    {backendBaseUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(backendBaseUrl, 'spark')}
                    tabIndex={0}
                    aria-label="Copiar URL base para o Google Spark"
                    className="tv-focus-glow inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-medium transition-colors cursor-pointer shrink-0"
                  >
                    {copiedField === 'spark' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-amber-300" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-white/50">
                  O Spark detectará as ferramentas automaticamente e abrirá a tela de autorização do Akasha para o seu login.
                </p>
              </div>

              {/* Garantias de Segurança e Revogação */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200/90 text-[11px] leading-relaxed flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Segurança e LGPD:</strong> O agente nunca tem acesso à sua senha. A qualquer momento você pode revogar o acesso de qualquer agente clicando em <em>Revogar</em> nesta mesma tela.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMcpGuideModal(false)}
                tabIndex={0}
                aria-label="Entendi e fechar guia de conexão"
                className="tv-focus-glow w-full rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[44px]"
              >
                Entendi e Fechar
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

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
                className="tv-focus-glow w-full rounded-xl bg-white/10 hover:bg-white/15 px-4 py-3 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar e Manter Minha Conta
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                tabIndex={0}
                aria-label="Confirmar exclusão definitiva da conta"
                className="tv-focus-glow w-full rounded-xl bg-red-600 hover:bg-red-500 px-4 py-3 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
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
