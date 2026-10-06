import React, { useEffect, useState, useRef } from 'react';
import { useComicRecommendations } from '../../hooks/useComicRecommendations';
import type { ComicRecommendationItem } from '../../types/comic';
import { BookOpen, Layers } from 'lucide-react';
import { ThematicLoader } from '../ui/ThematicLoader';

interface ComicRecommendationRailProps {
  onSelectComic?: (comic: ComicRecommendationItem) => void;
  onQuickAdd?: (comic: ComicRecommendationItem) => void;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23283618'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

/**
 * Trilho de Recomendações Inteligentes de Quadrinhos e Mangás (Akasha Engine)
 *
 * Tratamento de Responsividade e Plataformas:
 * - Android TV (D-Pad): Todos os cards interativos possuem tabIndex={0}, foco com realce animado (.tv-focus-glow),
 *   auto-scroll suave centralizado com scrollIntoView({ inline: 'center' }) e botão de atalho para voltar ao início.
 * - Mobile (Touch): Scroll horizontal fluido com snap, touch targets amplos (mínimo 44px) e layout ergonômico.
 * - Desktop: Hover com elevação, transparência glassmorphic, visualização de motivos e abas interativas de filtragem.
 */
export const ComicRecommendationRail: React.FC<ComicRecommendationRailProps> = ({
  onSelectComic,
  onQuickAdd,
}) => {
  const { recommendations, isLoading, error, fetchRecommendations } = useComicRecommendations();
  const [filterType, setFilterType] = useState<'all' | 'comic' | 'manga'>('all');
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecommendations({ limit: 14, type: filterType });
  }, [fetchRecommendations, filterType]);

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
      onSelectComic?.(item);
    }
  };

  const handleScrollToStart = () => {
    if (railRef.current) {
      railRef.current.scrollTo({
        left: 0,
        behavior: 'smooth',
      });
      const firstCard = railRef.current.querySelector<HTMLDivElement>('[role="button"]');
      if (firstCard) {
        firstCard.focus();
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
    <section aria-label="Recomendações de Quadrinhos e Mangás" className="flex flex-col gap-4 my-6 animate-fade-in">
      {/* Cabeçalho do Trilho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-7 rounded-full bg-gradient-to-b from-[var(--color-caramelo-claro)] to-amber-700" />
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--color-caramelo-claro)]" />
              <h2 className="text-xl md:text-2xl font-bold font-cinzel text-[var(--color-seda-milharal)]">
                Sagas & Mangás Sugeridos
              </h2>
            </div>
            <p className="text-xs text-stone-400 font-outfit mt-0.5">
              Recomendações baseadas nas suas leituras e universo editorial do Akasha
            </p>
          </div>
        </div>

        {/* Controles de Navegação e Filtros */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap self-start sm:self-auto">
          {/* Botão de Atalho para TV / D-Pad: Voltar ao Início */}
          <button
            type="button"
            tabIndex={0}
            onClick={handleScrollToStart}
            aria-label="Voltar ao início das recomendações de quadrinhos"
            className="
              tv-focus-glow flex items-center gap-1.5 px-3 py-1.5 text-xs font-outfit font-medium rounded-lg
              bg-white/5 hover:bg-white/10 text-[var(--color-seda-milharal)] border border-white/10
              focus-visible:ring-2 focus-visible:ring-[var(--color-caramelo-claro)] outline-none cursor-pointer transition-all
            "
          >
            <span>⏮</span>
            <span>Início</span>
          </button>

          {/* Abas de Filtro (Todos / Quadrinhos / Mangás) */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'comic', label: 'Quadrinhos' },
                { id: 'manga', label: 'Mangás & Manhwas' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                tabIndex={0}
                onClick={() => setFilterType(tab.id)}
                className={`
                  px-3 py-1.5 text-xs font-outfit font-medium rounded-md transition-all duration-200
                  focus-visible:ring-2 focus-visible:ring-[var(--color-caramelo-claro)] outline-none
                  ${
                    filterType === tab.id
                      ? 'bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] font-semibold shadow'
                      : 'text-[var(--color-seda-milharal)]/70 hover:text-[var(--color-seda-milharal)] hover:bg-white/5'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Carrossel de Obras */}
      <div className="relative w-full overflow-hidden">
        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 custom-scrollbar scroll-smooth"
        >
          {recommendations.map((comic) => {
            const creatorsDisplay =
              comic.creators && comic.creators.length > 0
                ? comic.creators.join(', ')
                : comic.publisher || 'Criador Desconhecido';

            const typeBadge =
              comic.type === 'manhwa' ? 'Manhwa' : comic.type === 'manga' ? 'Mangá' : 'Saga';

            const countDisplay =
              comic.issueCount && comic.issueCount > 0
                ? `${comic.issueCount} Edições`
                : comic.volumeCount && comic.volumeCount > 0
                ? `${comic.volumeCount} Vol.`
                : null;

            return (
              <div
                key={comic.id}
                role="button"
                tabIndex={0}
                onFocus={handleCardFocus}
                onClick={() => onSelectComic?.(comic)}
                onKeyDown={(e) => handleKeyDown(e, comic)}
                aria-label={`${comic.title} (${typeBadge}) - ${comic.score}% de Afinidade. ${comic.reason}`}
                className="
                  tv-focus-glow snap-start flex-none w-[175px] sm:w-[205px]
                  group relative flex flex-col rounded-xl overflow-hidden
                  bg-white/5 border border-white/10 backdrop-blur-md
                  cursor-pointer transition-all duration-300
                  hover:-translate-y-1.5 hover:border-[var(--color-caramelo-claro)]/60 hover:shadow-xl hover:shadow-black/60
                  focus:outline-none focus:border-[var(--color-caramelo-claro)] focus:ring-2 focus:ring-[var(--color-caramelo-claro)]/80
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

                  {/* Badge de Afinidade (% Match) */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-0.5 border border-[var(--color-caramelo-claro)]/40 shadow z-10">
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

                  {/* Badge de Edições / Ano */}
                  {(countDisplay || comic.releaseYear) && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-outfit text-stone-300">
                      {comic.releaseYear && <span>{comic.releaseYear}</span>}
                      {comic.releaseYear && countDisplay && <span>•</span>}
                      {countDisplay && <span>{countDisplay}</span>}
                    </div>
                  )}
                </div>

                {/* Informações da Obra */}
                <div className="p-3 flex flex-col flex-1 justify-between gap-1.5">
                  <div>
                    <h3 className="font-outfit font-semibold text-sm text-[var(--color-seda-milharal)] line-clamp-2 leading-snug group-hover:text-[var(--color-caramelo-claro)] transition-colors">
                      {comic.title}
                    </h3>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <p
                        className="font-outfit text-[11px] text-[var(--color-caramelo-claro)] opacity-90 line-clamp-1"
                        title={creatorsDisplay}
                      >
                        {creatorsDisplay}
                      </p>
                      {comic.genres && comic.genres.length > 0 && (
                        <span className="text-[9px] font-outfit px-1.5 py-0.5 rounded bg-white/10 text-stone-300">
                          {comic.genres[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Motivo amigável da recomendação com Caixa Temática */}
                  <div className="mt-1 p-2 rounded-lg bg-[var(--color-caramelo-claro)]/10 border border-[var(--color-caramelo-claro)]/20 text-[10px] font-outfit text-stone-200 leading-tight">
                    <span className="font-semibold block text-[var(--color-caramelo-claro)] mb-0.5">Motivo:</span>
                    <p className="line-clamp-2">{comic.reason}</p>
                  </div>

                  {onQuickAdd && (
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAdd(comic);
                      }}
                      className="tv-focus-glow mt-1.5 py-1.5 px-2 text-xs font-outfit font-semibold rounded-lg bg-white/10 hover:bg-[var(--color-caramelo-claro)] hover:text-[var(--color-floresta-negra)] text-stone-200 transition-colors cursor-pointer"
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
    </section>
  );
};
