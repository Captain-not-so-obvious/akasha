import React, { useEffect, useRef } from 'react';
import { useGameRecommendations } from '../../hooks/useGameRecommendations';
import type { GameRecommendationItem } from '../../types/game';
import { ThematicLoader } from '../ui/ThematicLoader';

interface GameRecommendationRailProps {
  onSelectGame?: (game: GameRecommendationItem) => void;
  onQuickAdd?: (game: GameRecommendationItem) => void;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23283618'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

export const GameRecommendationRail: React.FC<GameRecommendationRailProps> = ({
  onSelectGame,
  onQuickAdd,
}) => {
  const { recommendations, isLoading, error, fetchRecommendations } = useGameRecommendations();
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, item: GameRecommendationItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onSelectGame) {
        onSelectGame(item);
      }
    }
  };

  if (isLoading && recommendations.length === 0) {
    return (
      <div className="w-full py-8 flex flex-col items-center justify-center bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
        <ThematicLoader
          domain="game"
          size="md"
          subtext="Recomendações Gamer"
        />
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Recomendações de Games"
      className="w-full flex flex-col gap-4 py-4 border-y border-white/10"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎮</span>
          <div>
            <h2 className="text-lg md:text-xl font-cinzel font-bold text-[var(--color-seda-milharal)]">
              Akasha Sugere para Jogar
            </h2>
            <p className="text-xs text-[var(--color-seda-milharal)]/70 font-outfit">
              Baseado no seu perfil de jogabilidade e avaliações de games
            </p>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        tabIndex={-1}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth focus:outline-none [-webkit-overflow-scrolling:touch]"
        style={{ scrollbarWidth: 'thin' }}
      >
        {recommendations.map((game) => (
          <div
            key={game.id}
            role="button"
            tabIndex={0}
            aria-label={`Jogo recomendado: ${game.title}. ${game.reason}`}
            onClick={() => onSelectGame?.(game)}
            onKeyDown={(e) => handleKeyDown(e, game)}
            onFocus={handleCardFocus}
            className="flex-shrink-0 w-44 md:w-52 group cursor-pointer flex flex-col bg-white/5 border border-white/10 hover:border-yellow-500/60 rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-yellow-900/20 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:scale-[1.05] focus:shadow-2xl focus:shadow-yellow-600/40 relative"
          >
            {/* Capa */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
              <img
                src={game.coverUrl || FALLBACK_COVER}
                alt={game.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_COVER;
                }}
              />

              {/* Tag de Nota / Score */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 border border-yellow-500/40 text-yellow-400 font-cinzel text-xs font-bold backdrop-blur-md flex items-center gap-1 shadow-md">
                <span>★</span>
                <span>{game.rating ? `${game.rating}%` : `${game.score} pts`}</span>
              </div>

              {/* Ano */}
              {game.releaseYear && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white/80 font-outfit text-xs backdrop-blur-sm">
                  {game.releaseYear}
                </div>
              )}
            </div>

            {/* Metadados */}
            <div className="p-3 flex flex-col flex-1 justify-between gap-2">
              <div>
                <h3 className="font-cinzel text-sm font-semibold text-white line-clamp-1 group-hover:text-yellow-400 transition-colors">
                  {game.title}
                </h3>

                {/* Plataformas / Gênero */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {game.genres.slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-white/70 font-outfit"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Motivo da Recomendação */}
              <div className="mt-1 pt-2 border-t border-white/10 flex flex-col gap-1.5">
                <p className="text-[11px] text-[var(--color-seda-milharal)]/80 italic font-outfit line-clamp-2">
                  ✨ {game.reason}
                </p>

                {onQuickAdd && (
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAdd(game);
                    }}
                    className="w-full py-1.5 px-2 mt-1 rounded bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/40 text-yellow-200 text-xs font-outfit font-medium flex items-center justify-center gap-1 transition-all focus:ring-2 focus:ring-yellow-400"
                  >
                    <span>+ Quero Jogar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
