import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassPanel } from '../components/ui/GlassPanel';
import { ArrowLeft, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import { CURRENT_TERMS_VERSION } from '../lib/legalVersions';

export const TermsOfUse: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[var(--color-floresta-negra)] text-[var(--color-seda-milharal)] p-4 md:p-8 flex justify-center">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-[var(--color-cobre)] opacity-15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-[var(--color-folha-oliva)] opacity-15 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 space-y-6">
        <button
          onClick={() => navigate(-1)}
          tabIndex={0}
          aria-label="Voltar para a tela anterior"
          className="tv-focus-glow inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-4 py-2 font-outfit text-sm text-[var(--color-seda-milharal)] transition-colors cursor-pointer border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <GlassPanel className="p-6 md:p-10 space-y-8">
          <div className="border-b border-white/10 pb-6 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-outfit">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Contrato de Utilização do Serviço</span>
            </div>
            <h1 className="font-cinzel text-3xl md:text-4xl font-bold tracking-wider text-[var(--color-seda-milharal)]">
              Termos de Uso do Akasha
            </h1>
            <p className="font-outfit text-xs md:text-sm text-[var(--color-seda-milharal)] opacity-70">
              Versão vigente: {CURRENT_TERMS_VERSION} • Última atualização: 09 de outubro de 2026
            </p>
          </div>

          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              1. Aceitação dos Termos
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              Ao criar uma conta ou utilizar os serviços do <strong>Akasha</strong>, você concorda expressamente com estes Termos de Uso e com a nossa Política de Privacidade. Caso não concorde com qualquer disposição, você deve interromper o uso e solicitar a exclusão de sua conta.
            </p>
          </section>

          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              2. Natureza e Finalidade do Serviço
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              O Akasha é um compêndio e repositório pessoal de entretenimento digital (cinema, televisão, literatura, jogos eletrônicos e histórias em quadrinhos/mangás). O serviço fornece ferramentas de catalogação, resenhas de opinião, comparação social e recomendações inteligentes.
            </p>
            <p className="text-sm leading-relaxed opacity-90">
              O Akasha não transmite, hospeda ou distribui arquivos de mídia audiovisuais protegidos por direitos autorais; integramos apenas metadados públicos e capas através de APIs oficiais autorizadas (TMDB, IGDB, Google Books, AniList, Comic Vine e JustWatch).
            </p>
          </section>

          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              3. Regras de Conduta e Responsabilidade
            </h2>
            <div className="space-y-2 text-sm opacity-90">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Você é responsável pelas opiniões, notas e resenhas registradas em seu perfil social.</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span>É expressamente proibido publicar conteúdo ilícito, ofensivo, discriminatório ou que viole direitos de propriedade intelectual nas resenhas do acervo.</span>
              </div>
            </div>
          </section>

          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              4. Integração com Agentes de Inteligência Artificial (MCP)
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              Ao conectar assistentes inteligentes à sua conta via Model Context Protocol (MCP), você concede permissão temporária e revogável para que o agente consulte seu acervo e registre avaliações em seu nome. Você pode revogar essa concessão a qualquer instante pelo seu Perfil.
            </p>
          </section>

          <section className="space-y-3 font-outfit">
            <h2 className="font-cinzel text-xl font-semibold text-[var(--color-caramelo-claro)]">
              5. Rescisão e Encerramento de Conta
            </h2>
            <p className="text-sm leading-relaxed opacity-90">
              Você pode encerrar sua conta a qualquer momento de forma autônoma e imediata no painel de privacidade, resultando no expurgo definitivo de todos os seus dados.
            </p>
          </section>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-outfit opacity-70">
            <span>© 2026 Akasha • Fillipe Moreira</span>
            <button
              onClick={() => navigate('/privacidade')}
              tabIndex={0}
              className="underline hover:text-white cursor-pointer"
            >
              Política de Privacidade (LGPD)
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};
