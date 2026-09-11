import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GlassPanel } from '../components/ui/GlassPanel';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'https://akasha-backend.onrender.com';

export const OAuthAuthorize: React.FC = () => {
  const { user, session, signInWithGoogle, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientId = searchParams.get('client_id') || 'spark';
  const redirectUri = searchParams.get('redirect_uri') || '';
  const state = searchParams.get('state') || '';

  // Guardar parâmetros na sessão para resgatar caso a Supabase Auth redirecione para a raiz
  useEffect(() => {
    if (clientId && redirectUri) {
      sessionStorage.setItem(
        'pending_oauth',
        JSON.stringify({ clientId, redirectUri, state })
      );
    }
  }, [clientId, redirectUri, state]);

  const handleAuthorize = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const token = session?.access_token;
      const res = await fetch(`${BACKEND_URL}/oauth/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          state: state,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao autorizar conexão MCP.');
      }

      if (data.redirect_url) {
        sessionStorage.removeItem('pending_oauth');
        setRedirectTarget(data.redirect_url);
        setIsSuccess(true);

        // Redireciona para o Spark após 2.5 segundos para exibir o card de sucesso
        setTimeout(() => {
          window.location.href = data.redirect_url;
        }, 2500);
      } else {
        throw new Error('URL de redirecionamento não retornada pelo servidor.');
      }
    } catch (err: any) {
      console.error('Erro de autorização OAuth:', err);
      setErrorMsg(err.message || 'Erro ao processar autorização.');
      setIsSubmitting(false);
    }
  };

  const handleLoginFirst = async () => {
    const returnTo = `/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    await signInWithGoogle(returnTo);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-[var(--color-floresta-negra)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-cobre)] border-t-transparent"></div>
      </div>
    );
  }

  // TELA DE PARABÉNS / CONECTADO COM SUCESSO
  if (isSuccess && redirectTarget) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-[var(--color-floresta-negra)] px-4 py-8">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-600/20 blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-600/20 blur-[120px] pointer-events-none"></div>

        <GlassPanel className="w-full max-w-lg p-8 md:p-10 text-center flex flex-col items-center border border-emerald-500/30">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-4 animate-bounce">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="font-cinzel text-3xl font-bold tracking-widest text-[var(--color-seda-milharal)] drop-shadow-md mb-2">
            PARABÉNS!
          </h1>
          <p className="font-outfit text-base font-semibold text-emerald-300 mb-4">
            Akasha Conectado ao Google Spark com Sucesso!
          </p>

          <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-80 mb-6 leading-relaxed">
            Seu assistente de Inteligência Artificial já pode acessar suas recomendações, wishlist e avaliações.
            Redirecionando de volta em instantes...
          </p>

          <button
            onClick={() => window.location.href = redirectTarget}
            tabIndex={0}
            aria-label="Retornar ao Google Spark"
            className="tv-focus-glow group relative flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-4 font-outfit text-base font-semibold text-zinc-950 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 cursor-pointer"
          >
            <span>Retornar ao Google Spark Agora</span>
          </button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-[var(--color-floresta-negra)] px-4 py-8">
      {/* Visual Liquid Glass Background */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[var(--color-folha-oliva)] opacity-20 blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[var(--color-cobre)] opacity-25 blur-[120px] pointer-events-none"></div>

      <GlassPanel className="w-full max-w-lg p-8 md:p-10 text-center flex flex-col items-center">
        {/* Header com Logos Integradas */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <img src="/favicon.png" alt="Akasha Logo" className="w-12 h-12 object-contain drop-shadow-md" />
          <div className="h-4 w-0.5 bg-[var(--color-cobre)] opacity-50"></div>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
            <svg className="w-6 h-6 text-[var(--color-seda-milharal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        <h1 className="font-cinzel text-3xl font-bold tracking-widest text-[var(--color-seda-milharal)] drop-shadow-md mb-2">
          AUTORIZAR INTEGRAÇÃO
        </h1>
        <p className="font-outfit text-sm font-light text-[var(--color-seda-milharal)] opacity-80 mb-6">
          O aplicativo <strong className="text-amber-300 font-medium">Google Spark</strong> solicita permissão para se conectar ao seu repositório Akasha.
        </p>

        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[var(--color-caramelo-claro)] to-transparent mb-6 opacity-30"></div>

        {errorMsg && (
          <div className="mb-6 w-full rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-300 font-outfit text-left">
            {errorMsg}
          </div>
        )}

        {/* Permissões Solicitadas */}
        <div className="w-full text-left bg-black/20 rounded-xl p-4 border border-white/5 mb-6 space-y-3 font-outfit text-xs text-[var(--color-seda-milharal)]">
          <p className="font-semibold text-amber-200 text-xs uppercase tracking-wider mb-2">
            Permissões Concedidas:
          </p>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">•</span>
            <span>Visualizar e atualizar sua lista de mídias (Wishlist).</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">•</span>
            <span>Registrar avaliações e progresso de filmes e séries.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold">•</span>
            <span>Gerar recomendações personalizadas via Inteligência Artificial.</span>
          </div>
        </div>

        {/* Usuário Logado ou Login Solicitado */}
        {user ? (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs font-outfit text-[var(--color-seda-milharal)] mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Conectado como <strong className="text-white">{user.email}</strong></span>
            </div>

            <button
              onClick={handleAuthorize}
              disabled={isSubmitting}
              tabIndex={0}
              aria-label="Autorizar e Conectar"
              className="tv-focus-glow group relative flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-4 font-outfit text-base font-semibold text-zinc-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/20 active:translate-y-0 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent"></div>
              ) : (
                <span>Autorizar e Conectar</span>
              )}
            </button>

            <button
              onClick={() => window.location.href = '/'}
              tabIndex={0}
              className="text-xs font-outfit text-white/50 hover:text-white transition-colors cursor-pointer mt-1"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-4">
            <p className="font-outfit text-xs text-amber-200/80 mb-2">
              Faça login no Akasha para confirmar a autorização.
            </p>
            <button
              onClick={handleLoginFirst}
              tabIndex={0}
              aria-label="Entrar com o Google para Autorizar"
              className="tv-focus-glow group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 font-outfit text-base font-semibold text-zinc-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/5 active:translate-y-0 cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Entrar com o Google para Autorizar</span>
            </button>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};
