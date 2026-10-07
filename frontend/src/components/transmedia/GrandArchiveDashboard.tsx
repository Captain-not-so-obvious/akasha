import React, { useEffect } from 'react';
import { useTransmedia } from '../../hooks/useTransmedia';
import {
  Film,
  Gamepad2,
  BookOpen,
  BookCopy,
  Sparkles,
  Trophy,
  Clock,
  Compass,
  Star,
  Layers,
  CheckCircle2,
  PlayCircle,
  Bookmark,
  XCircle,
} from 'lucide-react';
import { ThematicLoader } from '../ui/ThematicLoader';
import type { TransmediaDomain } from '../../types/transmedia';

function getDomainBadge(domain: TransmediaDomain) {
  switch (domain) {
    case 'movie':
    case 'tv':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <Film className="w-3 h-3" /> Cinema/TV
        </span>
      );
    case 'game':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <Gamepad2 className="w-3 h-3" /> Games
        </span>
      );
    case 'book':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
          <BookOpen className="w-3 h-3" /> Livros
        </span>
      );
    case 'comic':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
          <BookCopy className="w-3 h-3" /> HQs/Mangás
        </span>
      );
  }
}

export const GrandArchiveDashboard: React.FC = () => {
  const { stats, isLoading, error, fetchStats } = useTransmedia();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading && !stats) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center glass-panel rounded-2xl">
        <ThematicLoader domain="movie" size="lg" subtext="Calculando métricas do Grande Acervo..." />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 glass-panel rounded-2xl text-center">
        <p className="text-red-400 font-outfit">{error || 'Não foi possível carregar as métricas do acervo.'}</p>
        <button
          onClick={() => fetchStats()}
          tabIndex={0}
          className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-caramelo-claro)] text-black font-semibold tv-focus-glow min-h-[44px]"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const {
    totalItems,
    domainBreakdown,
    statusBreakdown,
    ratingStats,
    consumptionMetrics,
    franchiseStats,
    diversityIndex,
  } = stats;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Banner de Arquétipo Cultural & Amplitude Akasha */}
      <section
        tabIndex={0}
        aria-label="Arquétipo Cultural e Amplitude Akasha"
        className="glass-panel p-6 md:p-8 rounded-3xl relative overflow-hidden tv-focus-glow border border-white/15 focus:outline-none focus:scale-[1.01] transition-transform duration-200"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[var(--color-caramelo-claro)]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--color-caramelo-claro)]/20 text-[var(--color-caramelo-claro)] border border-[var(--color-caramelo-claro)]/30 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Arquétipo Cultural
              </span>
              <span className="text-xs text-[var(--color-seda-milharal)]/60 font-mono">
                {totalItems} obras catalogadas
              </span>
            </div>

            <h2 className="text-2xl md:text-4xl font-cinzel font-bold text-[var(--color-caramelo-claro)]">
              {diversityIndex.archetypeTitle}
            </h2>

            <p className="text-sm md:text-base text-[var(--color-seda-milharal)]/80 font-outfit leading-relaxed">
              {diversityIndex.archetypeDescription}
            </p>
          </div>

          {/* Medidor do Índice de Amplitude Cultural */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-black/40 border border-white/10 shrink-0 min-w-[200px]">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-seda-milharal)]/60 mb-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-[var(--color-caramelo-claro)]" />
              Amplitude Akasha
            </span>
            <div className="text-4xl md:text-5xl font-mono font-bold text-[var(--color-caramelo-claro)]">
              {diversityIndex.score}%
            </div>
            {/* Barra de Progresso Liquid Glass */}
            <div className="w-full bg-white/10 h-2.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 via-[var(--color-caramelo-claro)] to-emerald-400 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(5, diversityIndex.score))}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Grid de Domínios Culturais Consolidados */}
      <section aria-label="Métricas por Domínio Cultural">
        <h3 className="text-xl font-cinzel font-bold text-[var(--color-caramelo-claro)] mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Domínios do Conhecimento & Entretenimento
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Cinema & Séries */}
          <div
            tabIndex={0}
            className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between tv-focus-glow hover:border-amber-400/40 transition-colors focus:outline-none"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
                  <Film className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono font-semibold text-amber-300">
                  {domainBreakdown.movie.percentage + domainBreakdown.tv.percentage}% do acervo
                </span>
              </div>
              <h4 className="font-cinzel font-bold text-lg text-[var(--color-seda-milharal)]">Cinema & TV</h4>
              <p className="text-3xl font-mono font-bold text-white mt-1">
                {domainBreakdown.movie.count + domainBreakdown.tv.count}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[var(--color-seda-milharal)]/70">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                ~{consumptionMetrics.estimatedScreenHours}h de tela
              </span>
              {domainBreakdown.movie.averageRating && (
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Star className="w-3 h-3 fill-amber-300" />
                  {domainBreakdown.movie.averageRating}★
                </span>
              )}
            </div>
          </div>

          {/* Card Jogos */}
          <div
            tabIndex={0}
            className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between tv-focus-glow hover:border-emerald-400/40 transition-colors focus:outline-none"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Gamepad2 className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-300">
                  {domainBreakdown.game.percentage}% do acervo
                </span>
              </div>
              <h4 className="font-cinzel font-bold text-lg text-[var(--color-seda-milharal)]">Jogos</h4>
              <p className="text-3xl font-mono font-bold text-white mt-1">{domainBreakdown.game.count}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[var(--color-seda-milharal)]/70">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-300" />
                ~{consumptionMetrics.estimatedGameHours}h jogadas
              </span>
              {domainBreakdown.game.averageRating && (
                <span className="flex items-center gap-1 text-emerald-300 font-bold">
                  <Star className="w-3 h-3 fill-emerald-300" />
                  {domainBreakdown.game.averageRating}★
                </span>
              )}
            </div>
          </div>

          {/* Card Livros */}
          <div
            tabIndex={0}
            className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between tv-focus-glow hover:border-orange-400/40 transition-colors focus:outline-none"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 rounded-xl bg-orange-500/20 text-orange-300">
                  <BookOpen className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono font-semibold text-orange-300">
                  {domainBreakdown.book.percentage}% do acervo
                </span>
              </div>
              <h4 className="font-cinzel font-bold text-lg text-[var(--color-seda-milharal)]">Livros</h4>
              <p className="text-3xl font-mono font-bold text-white mt-1">{domainBreakdown.book.count}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[var(--color-seda-milharal)]/70">
              <span className="flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 text-orange-300" />
                ~{consumptionMetrics.estimatedPagesRead} páginas
              </span>
              {domainBreakdown.book.averageRating && (
                <span className="flex items-center gap-1 text-orange-300 font-bold">
                  <Star className="w-3 h-3 fill-orange-300" />
                  {domainBreakdown.book.averageRating}★
                </span>
              )}
            </div>
          </div>

          {/* Card Quadrinhos & Mangás */}
          <div
            tabIndex={0}
            className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between tv-focus-glow hover:border-purple-400/40 transition-colors focus:outline-none"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
                  <BookCopy className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono font-semibold text-purple-300">
                  {domainBreakdown.comic.percentage}% do acervo
                </span>
              </div>
              <h4 className="font-cinzel font-bold text-lg text-[var(--color-seda-milharal)]">HQs & Mangás</h4>
              <p className="text-3xl font-mono font-bold text-white mt-1">{domainBreakdown.comic.count}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-[var(--color-seda-milharal)]/70">
              <span className="flex items-center gap-1">
                <BookCopy className="w-3.5 h-3.5 text-purple-300" />
                {consumptionMetrics.totalComicVolumes} sagas/volumes
              </span>
              {domainBreakdown.comic.averageRating && (
                <span className="flex items-center gap-1 text-purple-300 font-bold">
                  <Star className="w-3 h-3 fill-purple-300" />
                  {domainBreakdown.comic.averageRating}★
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Status de Consumo & Avaliações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <section
          tabIndex={0}
          aria-label="Status de consumo cultural"
          className="glass-panel p-6 rounded-2xl border border-white/10 tv-focus-glow focus:outline-none"
        >
          <h4 className="font-cinzel font-bold text-lg text-[var(--color-caramelo-claro)] mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Progresso de Consumo
          </h4>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-outfit mb-1">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Concluídos / Zerados / Lidos
                </span>
                <span className="font-mono">{statusBreakdown.completed.count} ({statusBreakdown.completed.percentage}%)</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${statusBreakdown.completed.percentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-outfit mb-1">
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <PlayCircle className="w-4 h-4" /> Em Andamento
                </span>
                <span className="font-mono">{statusBreakdown.watching.count} ({statusBreakdown.watching.percentage}%)</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${statusBreakdown.watching.percentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-outfit mb-1">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Bookmark className="w-4 h-4" /> Quero Consumir (Backlog)
                </span>
                <span className="font-mono">{statusBreakdown.plan_to_watch.count} ({statusBreakdown.plan_to_watch.percentage}%)</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${statusBreakdown.plan_to_watch.percentage}%` }}
                />
              </div>
            </div>

            {statusBreakdown.dropped.count > 0 && (
              <div>
                <div className="flex justify-between text-xs font-outfit mb-1">
                  <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                    <XCircle className="w-4 h-4" /> Abandonados
                  </span>
                  <span className="font-mono">{statusBreakdown.dropped.count} ({statusBreakdown.dropped.percentage}%)</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${statusBreakdown.dropped.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Avaliações e Estrelas */}
        <section
          tabIndex={0}
          aria-label="Estatísticas de Avaliações"
          className="glass-panel p-6 rounded-2xl border border-white/10 tv-focus-glow focus:outline-none flex flex-col justify-between"
        >
          <div>
            <h4 className="font-cinzel font-bold text-lg text-[var(--color-caramelo-claro)] mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Critério Cultural & Avaliações
            </h4>

            <div className="flex items-center gap-6 mb-4">
              <div className="text-center p-3 rounded-2xl bg-black/40 border border-white/10 min-w-[90px]">
                <div className="text-3xl font-mono font-bold text-[var(--color-caramelo-claro)]">
                  {ratingStats.average > 0 ? ratingStats.average : '—'}
                </div>
                <div className="flex justify-center text-amber-400 my-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= Math.round(ratingStats.average) ? 'fill-amber-400' : 'opacity-20'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-[var(--color-seda-milharal)]/60 font-mono">
                  {ratingStats.ratedCount} avaliados
                </span>
              </div>

              {/* Histograma de 5 a 1 estrelas */}
              <div className="flex-1 space-y-1.5 text-xs font-mono">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingStats.distribution[String(stars)] || 0;
                  const pct = ratingStats.ratedCount > 0 ? (count / ratingStats.ratedCount) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="w-6 text-right text-[var(--color-seda-milharal)]/70">{stars}★</span>
                      <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-[11px] text-[var(--color-seda-milharal)]/50">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--color-seda-milharal)]/60 italic font-outfit">
            * Suas notas treinam ativamente o algoritmo de recomendação Akasha por meio de ponderação de afinidade.
          </p>
        </section>
      </div>

      {/* 4. Franquias com Presença Multimídia no Acervo */}
      {franchiseStats.topFranchises.length > 0 && (
        <section aria-label="Franquias com Presença Transmídia">
          <h3 className="text-xl font-cinzel font-bold text-[var(--color-caramelo-claro)] mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Universos Compartilhados na sua Coleção
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {franchiseStats.topFranchises.map((franchise) => (
              <div
                key={franchise.name}
                tabIndex={0}
                className="glass-panel p-4 rounded-2xl border border-white/10 tv-focus-glow hover:border-[var(--color-caramelo-claro)] transition-colors focus:outline-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-cinzel font-bold text-base text-[var(--color-seda-milharal)]">
                    {franchise.name}
                  </h5>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-[var(--color-caramelo-claro)]">
                    {franchise.count} obras
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {franchise.domains.map((d) => (
                    <React.Fragment key={d}>{getDomainBadge(d)}</React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
