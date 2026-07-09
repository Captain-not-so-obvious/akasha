import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { GlassPanel } from '../components/ui/GlassPanel';

export const Login: React.FC = () => {
  const { signInWithGoogle, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Falha no login com Google:', err);
      setErrorMsg(err.message || 'Ocorreu um erro ao conectar com o Google.');
      setIsSubmitting(false);
    }
  };

  // Se o usuário de alguma forma já estiver logado na tela de login
  if (user) {
    // Roteamento lidará com isso, mas retornamos nulo temporariamente
    return null;
  }

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-[var(--color-floresta-negra)] px-4">
      {/* Círculos decorativos de background com blur para visual premium de vidro (Liquid Glass) */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[var(--color-folha-oliva)] opacity-20 blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[var(--color-cobre)] opacity-25 blur-[120px] pointer-events-none"></div>

      <GlassPanel className="w-full max-w-md p-8 md:p-10 text-center flex flex-col items-center">
        {/* Logo Akasha */}
        <h1 className="font-cinzel text-5xl font-bold tracking-widest text-[var(--color-seda-milharal)] drop-shadow-md mb-2">
          AKASHA
        </h1>
        <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-[var(--color-caramelo-claro)] to-transparent mb-6"></div>

        {/* Descrição */}
        <p className="font-outfit text-sm font-light text-[var(--color-seda-milharal)] opacity-80 max-w-xs mb-8 leading-relaxed">
          Seu repositório inteligente e imersivo de entretenimento digital.
        </p>

        {errorMsg && (
          <div className="mb-6 w-full rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-300 font-outfit text-left">
            {errorMsg}
          </div>
        )}

        {/* Botão de Autenticação - D-Pad Android TV Compatível */}
        <button
          onClick={handleLogin}
          disabled={isSubmitting}
          tabIndex={0}
          aria-label="Entrar com o Google"
          className="tv-focus-glow group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 font-outfit text-base font-semibold text-zinc-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/5 active:translate-y-0 cursor-pointer disabled:pointer-events-none disabled:opacity-60"
        >
          {isSubmitting ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent"></div>
          ) : (
            <svg
              className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span className="truncate">
            {isSubmitting ? 'Conectando...' : 'Entrar com o Google'}
          </span>
        </button>

        {/* Footer Discreto da TV */}
        <p className="mt-8 font-outfit text-xs text-[var(--color-seda-milharal)] opacity-40">
          Utilize o controle remoto da TV (teclas direcionais) ou o teclado para navegar.
        </p>
      </GlassPanel>
    </div>
  );
};
