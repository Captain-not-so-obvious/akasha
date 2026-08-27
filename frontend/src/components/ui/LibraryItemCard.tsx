import React from 'react';
import { Image as ImageIcon, Trash2, Star, ArrowRight, Info } from 'lucide-react';
import type { LibraryItem, WishlistStatus } from '../../types/wishlist';
import type { MediaDetails } from '../../types/media';
import { StatusBadge } from './StatusBadge';
import { RatingStars } from './RatingStars';
import { getReleaseYear } from '../../utils/date';

interface LibraryItemCardProps {
  item: LibraryItem;
  onEdit: (item: LibraryItem) => void;
  onRemove: (item: LibraryItem) => void;
  onStatusChange: (item: LibraryItem, newStatus: WishlistStatus) => void;
  onSelect?: (media: MediaDetails) => void;
}

export function LibraryItemCard({ item, onEdit, onRemove, onStatusChange, onSelect }: LibraryItemCardProps) {
  const { media, status, userRating } = item;
  const year = getReleaseYear(media.releaseDate);
  
  const getNextStatusInfo = (currentStatus: WishlistStatus): { next: WishlistStatus; label: string } | null => {
    if (currentStatus === 'plan_to_watch') return { next: 'watching', label: 'Começar' };
    if (currentStatus === 'watching') return { next: 'completed', label: 'Concluir' };
    return null;
  };

  const nextStatusInfo = getNextStatusInfo(status);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Se o clique foi originado de um botão interno, não dispara a seleção do card
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('button')) {
      return;
    }
    onSelect?.(media);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const targetElement = e.target as HTMLElement;
      if (targetElement.closest('button')) {
        return;
      }
      e.preventDefault();
      onSelect?.(media);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Card de ${media.title}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className="tv-focus-glow group relative flex flex-col rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-caramelo-claro)]"
    >
      {/* Pôster container */}
      <div className="relative aspect-[2/3] w-full bg-black/40">
        {media.posterUrl ? (
          <img
            src={media.posterUrl}
            alt={media.title}
            className="w-full h-full object-cover"
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
            <span className="font-outfit text-[11px] font-bold text-[var(--color-seda-milharal)] leading-none">{userRating}</span>
          </div>
        )}
        
        {/* Overlay com Ações */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
          <div className="flex gap-2">
            <button
              type="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(media);
              }}
              className="tv-focus-glow bg-white/20 text-white p-2.5 rounded-full hover:bg-white/40 transition-colors cursor-pointer"
              title="Ver Sinopse"
              aria-label={`Ver sinopse de ${media.title}`}
            >
              <Info size={18} />
            </button>
            <button
              type="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="tv-focus-glow bg-[var(--color-caramelo-claro)] text-black p-2.5 rounded-full hover:bg-[var(--color-cobre)] hover:text-white transition-colors cursor-pointer"
              title="Avaliar"
              aria-label={`Avaliar ${media.title}`}
            >
              <Star size={18} className="fill-current" />
            </button>
            <button
              type="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              className="tv-focus-glow bg-red-500/80 text-white p-2.5 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
              title="Remover"
              aria-label={`Remover ${media.title} da biblioteca`}
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          {nextStatusInfo && (
            <button
              type="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(item, nextStatusInfo.next);
              }}
              className="tv-focus-glow bg-white/10 text-white text-xs font-bold font-outfit px-4 py-2 rounded-full flex items-center gap-1 hover:bg-white/20 transition-colors cursor-pointer"
              aria-label={`Mudar status para ${nextStatusInfo.label}`}
            >
              {nextStatusInfo.label} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Info do Card */}
      <div className="p-3 flex flex-col justify-between gap-2.5 flex-1">
        <div>
          <h3 className="font-cinzel font-bold text-[var(--color-caramelo-claro)] text-sm line-clamp-1 group-hover:text-white transition-colors duration-300" title={media.title}>
            {media.title}
          </h3>
          {year && (
            <span className="font-outfit text-xs text-[var(--color-caramelo-claro)]/70">
              {year}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 mt-auto">
          <div className="flex items-center">
            <StatusBadge status={status} />
          </div>
          {userRating && (
            <div className="flex items-center gap-1.5">
              <RatingStars rating={userRating} size={11} />
              <span className="text-[10px] font-bold text-[var(--color-seda-milharal)]/40 font-outfit">({userRating}/5)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

