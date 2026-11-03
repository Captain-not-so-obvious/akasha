import React from 'react';
import { Image as ImageIcon, Star } from 'lucide-react';
import type { LibraryItem, WishlistStatus } from '../../types/wishlist';
import type { MediaDetails } from '../../types/media';
import { StatusBadge } from './StatusBadge';
import { RatingStars } from './RatingStars';
import { getReleaseYear } from '../../utils/date';

interface LibraryItemCardProps {
  item: LibraryItem;
  onEdit?: (item: LibraryItem) => void;
  onRemove?: (item: LibraryItem) => void;
  onStatusChange?: (item: LibraryItem, newStatus: WishlistStatus) => void;
  onSelect?: (media: MediaDetails) => void;
  onSelectItem?: (item: LibraryItem) => void;
}

/**
 * Card de exibição de um item na Biblioteca do Akasha.
 *
 * Diretrizes de UX e Plataforma (Android TV, Mobile & Desktop):
 * - TV/D-Pad First: O card inteiro é a única entidade focalizável (tabIndex={0}),
 *   sem botões aninhados ou atalhos na superfície do card que possam causar focus traps
 *   ou acionamentos acidentais (como exclusão ou conclusão indevida) via controle remoto.
 * - Ao clicar ou pressionar Enter/Espaço no card, o modal de detalhes correspondente
 *   é aberto, onde todas as opções (Começar, Concluir, Avaliar, Remover) são apresentadas
 *   com segurança e contexto completo.
 * - Mobile & Touch: Área de toque ampla (touch target total do card), sem dependência de hover.
 */
export function LibraryItemCard({
  item,
  onSelect,
  onSelectItem,
}: LibraryItemCardProps) {
  const { media, status, userRating, notes } = item;
  const year = getReleaseYear(media.releaseDate);

  const handleCardClick = () => {
    if (onSelectItem) {
      onSelectItem(item);
    } else {
      onSelect?.(media);
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Card de ${media.title || item.title}${year ? `, ${year}` : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="tv-focus-glow group relative flex flex-col rounded-xl overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-white/[0.08] hover:border-[var(--color-caramelo-claro)]/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-caramelo-claro)]"
    >
      {/* Pôster container */}
      <div className="relative aspect-[2/3] w-full bg-black/40 overflow-hidden">
        {media.posterUrl ? (
          <img
            src={media.posterUrl}
            alt={media.title || item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10">
            <ImageIcon size={48} />
          </div>
        )}

        {/* Badge de Avaliação no topo do Pôster */}
        {userRating && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-md z-10">
            <Star size={10} className="fill-[var(--color-caramelo-claro)] text-[var(--color-caramelo-claro)]" />
            <span className="font-outfit text-[11px] font-bold text-[var(--color-seda-milharal)] leading-none">
              {userRating}
            </span>
          </div>
        )}

        {/* Shimmer de hover / foco */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-t from-[var(--color-caramelo-claro)]/10 to-transparent" />
      </div>

      {/* Info do Card */}
      <div className="p-3 flex flex-col justify-between gap-2.5 flex-1">
        <div>
          <h3
            className="font-cinzel font-bold text-[var(--color-caramelo-claro)] text-sm line-clamp-1 group-hover:text-white transition-colors duration-300"
            title={media.title || item.title}
          >
            {media.title || item.title}
          </h3>
          {year && (
            <span className="font-outfit text-xs text-[var(--color-caramelo-claro)]/70">
              {year}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 mt-auto">
          <div className="flex items-center justify-between gap-1">
            <StatusBadge status={status} domain={item.domain} />
          </div>

          {userRating && (
            <div className="flex items-center gap-1.5">
              <RatingStars rating={userRating} size={11} />
              <span className="text-[10px] font-bold text-[var(--color-seda-milharal)]/40 font-outfit">
                ({userRating}/5)
              </span>
            </div>
          )}

          {notes && (
            <p
              className="text-[10px] sm:text-[11px] font-outfit text-stone-400 italic line-clamp-1 border-l-2 border-[var(--color-caramelo-claro)]/40 pl-1.5 mt-0.5"
              title={notes}
            >
              “{notes}”
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
