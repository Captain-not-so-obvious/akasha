import React from 'react';
import type { GameDetails } from '../../types/game';
import { Star, Gamepad2 } from 'lucide-react';

interface GameCardProps {
  game: GameDetails;
  onSelect?: (game: GameDetails) => void;
  isInLibrary?: boolean;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='267' viewBox='0 0 200 267'%3E%3Crect width='200' height='267' fill='%231b281f'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='sans-serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

/**
 * Card de exibição de um jogo na busca.
 *
 * Acessibilidade e Plataforma:
 * - TV/D-Pad: tabIndex={0} obrigatório. Efeito tv-focus-glow com tecla Enter/Espaço para acionamento.
 * - Mobile: Área de toque do card completo (touch target generoso).
 * - Visual: Liquid Glass, tags de plataformas, nota IGDB e badge "Na Biblioteca".
 */
export const GameCard: React.FC<GameCardProps> = ({ game, onSelect, isInLibrary = false }) => {
  const formattedRating = game.rating ? (game.rating / 10).toFixed(1) : null;

  const handleActivate = () => {
    onSelect?.(game);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${game.title}${game.releaseYear ? `, ${game.releaseYear}` : ''}${isInLibrary ? ', Já está na sua biblioteca' : ''}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      className="
        tv-focus-glow
        group relative flex flex-col rounded-xl overflow-hidden
        bg-white/5 border border-white/10
        cursor-pointer transition-all duration-300
        hover:-translate-y-1 hover:border-[var(--color-caramelo-claro)]/40
        hover:shadow-xl hover:shadow-black/40
      "
    >
      {/* Capa */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-floresta-negra)]">
        <img
          src={game.coverUrl ?? FALLBACK_COVER}
          alt={`Capa de ${game.title}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_COVER;
          }}
        />

        {/* Badge de nota IGDB */}
        {formattedRating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/75 backdrop-blur-sm px-2 py-1 shadow">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-outfit font-semibold text-white">{formattedRating}</span>
          </div>
        )}

        {/* Badge de tipo (Jogo) */}
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-[var(--color-folha-oliva)]/90 backdrop-blur-sm px-2 py-1 shadow">
          <Gamepad2 className="w-3 h-3 text-[var(--color-seda-milharal)]" />
          <span className="text-xs font-outfit font-semibold text-[var(--color-seda-milharal)]">
            Jogo
          </span>
        </div>

        {/* Badge "Na Biblioteca" */}
        {isInLibrary && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 rounded-md bg-emerald-600/90 backdrop-blur-md py-1 px-2 text-white shadow-lg border border-emerald-400/30">
            <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-outfit font-bold tracking-wide">Na Biblioteca</span>
          </div>
        )}
      </div>

      {/* Info do Jogo */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          <h3 className="font-outfit font-semibold text-sm text-[var(--color-seda-milharal)] line-clamp-2 leading-snug">
            {game.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {game.releaseYear && (
              <span className="font-outfit text-xs text-[var(--color-caramelo-claro)] opacity-90 font-medium">
                {game.releaseYear}
              </span>
            )}
            {game.genres && game.genres.length > 0 && (
              <span className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-60 truncate">
                • {game.genres[0]}
              </span>
            )}
          </div>
        </div>

        {/* Plataformas (chips pequenos) */}
        {game.platforms && game.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-white/5">
            {game.platforms.slice(0, 2).map((platform) => (
              <span
                key={platform}
                className="text-[10px] font-outfit px-1.5 py-0.5 rounded bg-white/10 text-[var(--color-seda-milharal)]/80"
              >
                {platform}
              </span>
            ))}
            {game.platforms.length > 2 && (
              <span className="text-[10px] font-outfit px-1 py-0.5 rounded bg-white/5 text-[var(--color-seda-milharal)]/50">
                +{game.platforms.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
