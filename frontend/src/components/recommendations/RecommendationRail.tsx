import React, { useEffect, useState } from 'react';
import { useRecommendations } from '../../hooks/useRecommendations';
import type { RecommendedItem } from '../../types/recommendation';
import type { MediaDetails } from '../../types/media';

interface RecommendationRailProps {
  onSelectMedia?: (media: MediaDetails) => void;
}

const FALLBACK_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23283618'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='serif'%3ESem Pôster%3C/text%3E%3C/svg%3E`;

/**
 * Componente de Carrossel de Recomendações Inteligentes (ML / Akasha Engine)
 *
 * Tratamento de Responsividade e Plataformas:
 * - Android TV (D-Pad): Todos os cards interativos possuem tabIndex={0}, aria-label explicativo,
 *   foco com realce animado (.tv-focus-glow) e suporte a ativação pelas teclas Enter ou Espaço.
 * - Mobile (Touch): scroll horizontal suave (overflow-x-auto, touch-action), áreas de toque amplas (min 44px).
 * - Desktop: Hover com elevação, transparência glassmorphic e visualização de motivos da recomendação.
 */
export const RecommendationRail: React.FC<RecommendationRailProps> = ({ onSelectMedia }) => {
  const { recommendations, isLoading, error, fetchRecommendations } = useRecommendations();
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');

  useEffect(() => {
    fetchRecommendations({ limit: 12, mediaType: filterType });
  }, [fetchRecommendations, filterType]);

  const handleSelect = (item: RecommendedItem) => {
    if (onSelectMedia) {
      onSelectMedia({
        id: item.tmdbId,
        title: item.title,
        overview: item.overview,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        mediaType: item.mediaType,
        voteAverage: item.voteAverage,
        releaseDate: null,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, item: RecommendedItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(item);
    }
  };

  if (isLoading && recommendations.length === 0) {
    return (
      <div className="w-full py-8 flex flex-col gap-3 items-center justify-center bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="w-8 h-8 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
        <p className="font-outfit text-sm text-[var(--color-seda-milharal)] animate-pulse">
          Calculando recomendações hiperpersonalizadas para você...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-red-200 text-sm font-outfit text-center">
        {error}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section aria-label="Recomendações Inteligentes" className="w-full flex flex-col gap-4 py-4">
      {/* Cabeçalho do Trilho de Recomendações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-7 rounded-full bg-gradient-to-b from-yellow-400 to-amber-600" />
          <div>
            <h2 className="font-cinzel font-bold text-xl text-[var(--color-seda-milharal)] tracking-wide">
              Recomendados para Você
            </h2>
            <p className="font-outfit text-xs text-[var(--color-caramelo-claro)] opacity-80">
              Gerado pelo motor inteligente baseado no seu histórico do Akasha
            </p>
          </div>
        </div>

        {/* Abas de Filtro (Filmes / Séries) */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10 self-start sm:self-auto">
          {(['all', 'movie', 'tv'] as const).map((type) => (
            <button
              key={type}
              type="button"
              tabIndex={0}
              onClick={() => setFilterType(type)}
              className={`
                px-3 py-1.5 text-xs font-outfit font-medium rounded-md transition-all duration-200
                focus-visible:ring-2 focus-visible:ring-yellow-400 outline-none
                ${
                  filterType === type
                    ? 'bg-[var(--color-caramelo-claro)] text-black font-semibold shadow'
                    : 'text-[var(--color-seda-milharal)]/70 hover:text-[var(--color-seda-milharal)] hover:bg-white/5'
                }
              `}
            >
              {type === 'all' ? 'Todos' : type === 'movie' ? 'Filmes' : 'Séries'}
            </button>
          ))}
        </div>
      </div>

      {/* Carrossel de Cards com Scroll Horizontal e Touch target amplo */}
      <div className="relative w-full overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin scrollbar-thumb-white/20 scroll-smooth snap-x">
          {recommendations.map((item) => (
            <div
              key={`${item.mediaType}-${item.tmdbId}`}
              role="button"
              tabIndex={0}
              aria-label={`Recomendação: ${item.title}. Motivo: ${item.reason}`}
              onClick={() => handleSelect(item)}
              onKeyDown={(e) => handleKeyDown(e, item)}
              className="
                tv-focus-glow snap-start flex-none w-[170px] sm:w-[200px]
                group relative flex flex-col rounded-xl overflow-hidden
                bg-white/5 border border-white/10 backdrop-blur-md
                cursor-pointer transition-all duration-300
                hover:-translate-y-1.5 hover:border-yellow-400/50 hover:shadow-xl hover:shadow-black/60
                focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/80
              "
            >
              {/* Pôster */}
              <div className="relative aspect-[2/3] overflow-hidden bg-[var(--color-floresta-negra)]">
                <img
                  src={item.posterUrl ?? FALLBACK_POSTER}
                  alt={`Pôster de ${item.title}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_POSTER;
                  }}
                />

                {/* Score badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-0.5 border border-yellow-400/30">
                  <span className="text-[10px] font-outfit font-bold text-yellow-400">
                    {item.score}% Match
                  </span>
                </div>

                {/* Tipo badge */}
                <div className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
                  <span className="text-[10px] font-outfit font-semibold text-[var(--color-seda-milharal)]">
                    {item.mediaType === 'movie' ? 'Filme' : 'Série'}
                  </span>
                </div>
              </div>

              {/* Informações e Explicação */}
              <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
                <div>
                  <h3 className="font-outfit font-semibold text-sm text-[var(--color-seda-milharal)] line-clamp-1 group-hover:text-yellow-300 transition-colors">
                    {item.title}
                  </h3>
                  {item.voteAverage && (
                    <div className="flex items-center gap-1 text-[11px] text-[var(--color-caramelo-claro)] opacity-90">
                      <span className="text-yellow-400">★</span>
                      <span>{item.voteAverage.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Badge de Explicação do Porquê da Recomendação */}
                <div className="mt-1 p-1.5 rounded-lg bg-yellow-950/30 border border-yellow-500/20 text-[10px] font-outfit text-yellow-200/90 leading-tight">
                  <span className="font-semibold block text-yellow-400 mb-0.5">Motivo:</span>
                  <p className="line-clamp-2">{item.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
