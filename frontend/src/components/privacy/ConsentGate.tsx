import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePrivacy } from '../../hooks/usePrivacy';
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '../../lib/legalVersions';
import { GlassPanel } from '../ui/GlassPanel';
import { ShieldCheck, ExternalLink, LogOut } from 'lucide-react';

interface ConsentGateProps {
  children: React.ReactNode;
}

export const ConsentGate: React.FC<ConsentGateProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const { checkPendingConsents, acceptConsent } = usePrivacy();

  const [pending, setPending] = useState<string[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (user) {
      checkPendingConsents().then((list) => {
        if (isMounted) {
          setPending(list);
          setHasChecked(true);
        }
      });
    } else {
      setHasChecked(true);
    }
    return () => {
      isMounted = false;
    };
  }, [user, checkPendingConsents]);

  const handleAcceptAll = async () => {
    if (!agreed || submitting) return;
    setSubmitting(true);

    try {
      if (pending.includes('terms')) {
        await acceptConsent('terms', CURRENT_TERMS_VERSION);
      }
      if (pending.includes('privacy')) {
        await acceptConsent('privacy', CURRENT_PRIVACY_VERSION);
      }
      setPending([]);
    } finally {
      setSubmitting(false);
    }
  };

  // Se não houver usuário logado ou se não houver pendências de consentimento, renderiza o app normalmente
  if (!user || !hasChecked || pending.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <GlassPanel className="w-full max-w-lg p-6 md:p-8 space-y-6 text-center border border-amber-500/30">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <ShieldCheck className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h2 className="font-cinzel text-2xl font-bold tracking-wide text-[var(--color-seda-milharal)]">
            Atualização de Privacidade & Termos
          </h2>
          <p className="font-outfit text-xs md:text-sm text-[var(--color-seda-milharal)] opacity-80 leading-relaxed">
            Para continuar explorando o Akasha em total conformidade com a Lei Geral de Proteção de Dados (LGPD), precisamos da sua concordância com os nossos termos atualizados.
          </p>
        </div>

        <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3 text-left font-outfit text-xs text-[var(--color-seda-milharal)]">
          <p className="font-semibold text-amber-200 uppercase tracking-wider text-[11px]">
            Documentos vigentes:
          </p>
          <div className="flex flex-col gap-2">
            <a
              href="/termos"
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={0}
              className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 underline"
            >
              <span>Termos de Uso do Akasha</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={0}
              className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 underline"
            >
              <span>Política de Privacidade (LGPD)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Checkbox Acessível para TV e Touch */}
        <label className="flex items-start gap-3 text-left cursor-pointer select-none font-outfit text-xs text-[var(--color-seda-milharal)] opacity-90 p-2 rounded-lg hover:bg-white/5 transition-colors">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            tabIndex={0}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-amber-400 cursor-pointer"
          />
          <span>
            Li e concordo com os Termos de Uso e com a Política de Privacidade do Akasha, incluindo a transferência internacional segura para fins de prestação do serviço.
          </span>
        </label>

        {/* Botões de Ação */}
        <div className="space-y-3 font-outfit">
          <button
            onClick={handleAcceptAll}
            disabled={!agreed || submitting}
            tabIndex={0}
            aria-label="Aceitar e Continuar"
            className="tv-focus-glow group relative flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3.5 text-sm font-semibold text-zinc-950 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {submitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
            ) : (
              <span>Aceitar e Continuar</span>
            )}
          </button>

          <button
            onClick={() => signOut()}
            tabIndex={0}
            aria-label="Sair da Conta"
            className="tv-focus-glow inline-flex items-center justify-center gap-2 text-xs text-white/50 hover:text-white transition-colors cursor-pointer w-full py-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da conta por enquanto</span>
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};
