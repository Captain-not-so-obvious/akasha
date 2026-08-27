import React from 'react';
import type { MediaDetails } from '../../types/media';
import { getReleaseYear } from '../../utils/date';

interface MovieCardProps {
  media: MediaDetails;
  onSelect?: (media: MediaDetails) => void;
  isInLibrary?: boolean;
}

const FALLBACK_POSTER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23283618'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='serif'%3ESem Pôster%3C/text%3E%3C/svg%3E`;

/**
 * Card de exibição de uma mídia (filme ou série).
 *
 * Compatibilidade de plataforma:
 * - TV/D-Pad: tabIndex={0} obrigatório. Efeito de scale e glow no :focus-visible
 *   via classe .tv-focus-glow. Ativação via Enter/OK é suportada com onKeyDown.
 * - Mobile: touch target mínimo de 44x44px (o card inteiro é clicável). Sem hover exclusivo.
 * - Desktop: hover com leve elevação e revelação do título completo.
 */
export const MovieCard: React.FC<MovieCardProps> = ({ media, onSelect, isInLibrary = false }) => {
  const year = getReleaseYear(media.releaseDate);
  const rating = media.voteAverage ? media.voteAverage.toFixed(1) : null;

  const handleActivate = () => {
    onSelect?.(media);
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
      aria-label={`${media.title}${year ? `, ${year}` : ''}${isInLibrary ? ', Já está na sua biblioteca' : ''}`}
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
      {/* Pôster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[var(--color-floresta-negra)]">
        <img
          src={media.posterUrl ?? FALLBACK_POSTER}
          alt={`Pôster de ${media.title}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_POSTER;
          }}
        />

        {/* Badge de nota */}
        {rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-sm px-2 py-1">
            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-outfit font-semibold text-white">{rating}</span>
          </div>
        )}

        {/* Badge de tipo (Filme/Série) */}
        <div className="absolute top-2 left-2 rounded-md bg-[var(--color-folha-oliva)]/80 backdrop-blur-sm px-2 py-1">
          <span className="text-xs font-outfit font-semibold text-[var(--color-seda-milharal)]">
            {media.mediaType === 'movie' ? 'Filme' : 'Série'}
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

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-outfit font-semibold text-sm text-[var(--color-seda-milharal)] line-clamp-2 leading-snug">
          {media.title}
        </h3>
        {year && (
          <span className="font-outfit text-xs text-[var(--color-caramelo-claro)] opacity-80">
            {year}
          </span>
        )}
      </div>

      {/* Shimmer de hover — overlay sutil */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-t from-[var(--color-caramelo-claro)]/5 to-transparent" />
    </div>
  );
};
