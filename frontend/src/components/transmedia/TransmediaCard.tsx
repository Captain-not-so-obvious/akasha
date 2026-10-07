import React from 'react';
import type { TransmediaRecommendationItem, TransmediaDomain } from '../../types/transmedia';
import { Film, Tv, Gamepad2, BookOpen, BookCopy, Sparkles, Plus, ArrowRight } from 'lucide-react';

interface TransmediaCardProps {
  item: TransmediaRecommendationItem;
  onSelect?: (item: TransmediaRecommendationItem) => void;
  onQuickAdd?: (item: TransmediaRecommendationItem) => void;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23283618'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='serif'%3EAkasha%3C/text%3E%3C/svg%3E`;

function getDomainIcon(domain: TransmediaDomain) {
  switch (domain) {
    case 'movie':
      return <Film className="w-3.5 h-3.5 text-amber-300" />;
    case 'tv':
      return <Tv className="w-3.5 h-3.5 text-blue-300" />;
    case 'game':
      return <Gamepad2 className="w-3.5 h-3.5 text-emerald-300" />;
    case 'book':
      return <BookOpen className="w-3.5 h-3.5 text-orange-300" />;
    case 'comic':
      return <BookCopy className="w-3.5 h-3.5 text-purple-300" />;
  }
}

function getDomainLabel(domain: TransmediaDomain): string {
  switch (domain) {
    case 'movie':
      return 'Filme';
    case 'tv':
      return 'Série';
    case 'game':
      return 'Jogo';
    case 'book':
      return 'Livro';
    case 'comic':
      return 'HQ/Mangá';
  }
}

export const TransmediaCard: React.FC<TransmediaCardProps> = ({
  item,
  onSelect,
  onQuickAdd,
}) => {
  const { franchiseName, sourceItem, targetItem, reason, score } = item;

  const handleCardFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (typeof e.currentTarget.scrollIntoView === 'function') {
      e.currentTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(item);
    }
  };

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Recomendação Transmídia: ${targetItem.title} do universo ${franchiseName}`}
      onClick={() => onSelect?.(item)}
      onFocus={handleCardFocus}
      onKeyDown={handleKeyDown}
      className="flex-shrink-0 w-64 md:w-72 flex flex-col justify-between bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 hover:border-[var(--color-caramelo-claro)] transition-all duration-300 overflow-hidden cursor-pointer group tv-focus-glow relative focus:outline-none focus:scale-[1.04]"
    >
      {/* Top Banner de Franquia & Ponte Transmídia */}
      <div className="p-3 bg-gradient-to-b from-white/10 to-transparent border-b border-white/5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3 h-3" />
            {franchiseName}
          </span>
          <span className="text-xs font-mono font-bold text-[var(--color-caramelo-claro)]">
            {score}% match
          </span>
        </div>

        {/* Indicador de Conexão Transmídia (De -> Para) */}
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-seda-milharal)]/70">
          <span className="flex items-center gap-1">
            {getDomainIcon(sourceItem.domain)}
            <span className="truncate max-w-[80px]">{sourceItem.title}</span>
          </span>
          <ArrowRight className="w-3 h-3 text-[var(--color-caramelo-claro)] shrink-0" />
          <span className="flex items-center gap-1 font-semibold text-[var(--color-seda-milharal)]">
            {getDomainIcon(targetItem.domain)}
            <span>{getDomainLabel(targetItem.domain)}</span>
          </span>
        </div>
      </div>

      {/* Capa e Detalhes da Obra Alvo */}
      <div className="p-3 flex gap-3 items-start flex-1">
        <div className="relative w-20 h-28 shrink-0 rounded-lg overflow-hidden bg-black/60 shadow-md border border-white/10">
          <img
            src={targetItem.coverUrl || FALLBACK_COVER}
            alt={targetItem.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_COVER;
            }}
          />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <h4 className="font-outfit font-bold text-sm text-[var(--color-seda-milharal)] line-clamp-2 leading-tight group-hover:text-[var(--color-caramelo-claro)] transition-colors">
            {targetItem.title}
          </h4>

          {targetItem.creatorOrAuthor && (
            <p className="text-xs text-[var(--color-seda-milharal)]/65 truncate mt-1">
              {targetItem.creatorOrAuthor}
            </p>
          )}

          {targetItem.releaseYear && (
            <span className="text-[11px] text-[var(--color-seda-milharal)]/50 mt-0.5">
              {targetItem.releaseYear}
            </span>
          )}

          {/* Justificativa Transmídia */}
          <p className="text-[11px] text-[var(--color-caramelo-claro)]/90 italic line-clamp-2 mt-2 leading-snug">
            "{reason}"
          </p>
        </div>
      </div>

      {/* Ações inferiores */}
      <div className="p-3 pt-0 flex items-center justify-between border-t border-white/5 mt-auto">
        <button
          type="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(item);
          }}
          className="text-xs font-semibold text-[var(--color-caramelo-claro)] hover:underline min-h-[44px] flex items-center"
        >
          Explorar Detalhes
        </button>

        {onQuickAdd && (
          <button
            type="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(item);
            }}
            aria-label={`Adicionar ${targetItem.title} ao acervo`}
            className="p-2 rounded-xl bg-white/10 hover:bg-[var(--color-caramelo-claro)] text-white hover:text-black transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
