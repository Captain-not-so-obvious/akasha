import React, { useEffect, useRef } from 'react';
import { useComicRecommendations } from '../../hooks/useComicRecommendations';
import type { ComicRecommendationItem } from '../../types/comic';
import { BookOpen, Layers } from 'lucide-react';
import { ThematicLoader } from '../ui/ThematicLoader';

interface ComicRecommendationRailProps {
  onSelectComic?: (comic: ComicRecommendationItem) => void;
  onQuickAdd?: (comic: ComicRecommendationItem) => void;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23283618'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

export const ComicRecommendationRail: React.FC<ComicRecommendationRailProps> = ({
  onSelectComic,
  onQuickAdd,
}) => {
  const { recommendations, isLoading, error, fetchRecommendations } = useComicRecommendations();
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecommendations(12);
  }, [fetchRecommendations]);

  const handleCardFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (typeof e.currentTarget.scrollIntoView === 'function') {
      e.currentTarget.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, item: ComicRecommendationItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onSelectComic) {
        onSelectComic(item);
      }
    }
  };

  if (isLoading && recommendations.length === 0) {
    return (
      <div className="w-full py-8 flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
        <ThematicLoader
          domain="comic"
          size="md"
          subtext="Recomendações de Quadrinhos & Mangás"
        />
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 my-6 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[var(--color-caramelo-claro)]" />
          <h2 className="text-xl md:text-2xl font-bold font-cinzel text-[var(--color-seda-milharal)]">
            Sagas & Mangás Sugeridos
          </h2>
        </div>
        <span className="text-xs text-stone-400 font-outfit hidden sm:inline">
          Recomendações baseadas nas suas leituras
        </span>
      </div>

      <div
        ref={railRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 custom-scrollbar"
      >
        {recommendations.map((comic) => {
          const creatorsDisplay =
            comic.creators && comic.creators.length > 0
              ? comic.creators.join(', ')
              : comic.publisher || 'Criador Desconhecido';

          const typeBadge =
            comic.type === 'manhwa' ? 'Manhwa' : comic.type === 'manga' ? 'Mangá' : 'Saga';

          return (
            <div
              key={comic.id}
              role="button"
              tabIndex={0}
              onFocus={handleCardFocus}
              onClick={() => onSelectComic?.(comic)}
              onKeyDown={(e) => handleKeyDown(e, comic)}
              aria-label={`${comic.title} (${typeBadge}) - ${comic.reason}`}
              className="
                tv-focus-glow
                snap-start shrink-0 w-36 sm:w-44 flex flex-col rounded-xl overflow-hidden
                bg-white/5 border border-white/10 group cursor-pointer transition-all duration-300
                hover:-translate-y-1 hover:border-[var(--color-caramelo-claro)]/40 hover:shadow-xl hover:shadow-black/40
              "
            >
              {/* Capa com Proporção Editorial */}
              <div className="relative aspect-[1/1.5] w-full bg-[var(--color-floresta-negra)] overflow-hidden">
                <img
                  src={comic.coverUrl ?? FALLBACK_COVER}
                  alt={comic.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_COVER;
                  }}
                />

                <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />

                {/* Badge de afinidade */}
                <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-0.5 border border-[var(--color-caramelo-claro)]/30 shadow z-10">
                  <span className="text-[10px] font-outfit font-bold text-[var(--color-caramelo-claro)]">
                    {comic.score}% Match
                  </span>
                </div>

                {/* Badge Tipo */}
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-[var(--color-folha-oliva)]/90 backdrop-blur-sm px-1.5 py-0.5 shadow z-10">
                  <BookOpen className="w-2.5 h-2.5 text-[var(--color-seda-milharal)]" />
                  <span className="text-[10px] font-outfit font-semibold text-[var(--color-seda-milharal)]">
                    {typeBadge}
                  </span>
                </div>
              </div>

              {/* Informações da Obra */}
              <div className="p-2.5 flex flex-col flex-1 justify-between gap-1">
                <div>
                  <h3 className="font-outfit font-semibold text-xs text-[var(--color-seda-milharal)] line-clamp-2 leading-snug">
                    {comic.title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <p
                      className="font-outfit text-[11px] text-[var(--color-caramelo-claro)] opacity-90 line-clamp-1"
                      title={creatorsDisplay}
                    >
                      {creatorsDisplay}
                    </p>
                    {comic.genres && comic.genres.length > 0 && (
                      <span className="text-[9px] font-outfit px-1.5 py-0.2 rounded bg-white/10 text-stone-300">
                        {comic.genres[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Motivo amigável da recomendação */}
                <p className="text-[10px] font-outfit text-stone-300 line-clamp-2 italic bg-black/30 p-1.5 rounded mt-1 border border-white/5">
                  "{comic.reason}"
                </p>

                {onQuickAdd && (
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAdd(comic);
                    }}
                    className="tv-focus-glow mt-1.5 py-1 px-2 text-[11px] font-outfit font-semibold rounded bg-white/10 hover:bg-[var(--color-caramelo-claro)] hover:text-[var(--color-floresta-negra)] text-stone-200 transition-colors"
                  >
                    + Quero Ler
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
