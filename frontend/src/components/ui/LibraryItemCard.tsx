import { Image as ImageIcon, Trash2, Star, ArrowRight } from 'lucide-react';
import type { LibraryItem, WishlistStatus } from '../../types/wishlist';
import { StatusBadge } from './StatusBadge';
import { RatingStars } from './RatingStars';

interface LibraryItemCardProps {
  item: LibraryItem;
  onEdit: (item: LibraryItem) => void;
  onRemove: (item: LibraryItem) => void;
  onStatusChange: (item: LibraryItem, newStatus: WishlistStatus) => void;
}

export function LibraryItemCard({ item, onEdit, onRemove, onStatusChange }: LibraryItemCardProps) {
  const { media, status, userRating } = item;
  
  const getNextStatusInfo = (currentStatus: WishlistStatus): { next: WishlistStatus; label: string } | null => {
    if (currentStatus === 'plan_to_watch') return { next: 'watching', label: 'Começar' };
    if (currentStatus === 'watching') return { next: 'completed', label: 'Concluir' };
    return null;
  };

  const nextStatusInfo = getNextStatusInfo(status);

  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden bg-black/20 border border-white/5 transition-all hover:bg-black/40">
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
        
        {/* Overlay com Ações */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
          <div className="flex gap-2">
            <button
              tabIndex={0}
              onClick={() => onEdit(item)}
              className="tv-focus-glow bg-[var(--color-caramelo-claro)] text-black p-2.5 rounded-full hover:bg-[var(--color-cobre)] hover:text-white transition-colors cursor-pointer"
              title="Avaliar"
            >
              <Star size={18} className="fill-current" />
            </button>
            <button
              tabIndex={0}
              onClick={() => onRemove(item)}
              className="tv-focus-glow bg-red-500/80 text-white p-2.5 rounded-full hover:bg-red-600 transition-colors cursor-pointer"
              title="Remover"
            >
              <Trash2 size={18} />
            </button>
          </div>
          
          {nextStatusInfo && (
            <button
              tabIndex={0}
              onClick={() => onStatusChange(item, nextStatusInfo.next)}
              className="tv-focus-glow bg-white/10 text-white text-xs font-bold font-outfit px-4 py-2 rounded-full flex items-center gap-1 hover:bg-white/20 transition-colors cursor-pointer"
            >
              {nextStatusInfo.label} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Info do Card */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="font-cinzel font-bold text-[var(--color-caramelo-claro)] text-sm line-clamp-1">
          {media.title}
        </h3>
        <div className="flex justify-between items-center mt-auto">
          <StatusBadge status={status} />
          {userRating && <RatingStars rating={userRating} />}
        </div>
      </div>
    </div>
  );
}
