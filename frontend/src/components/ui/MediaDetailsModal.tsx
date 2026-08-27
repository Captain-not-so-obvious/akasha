import { useEffect, useRef } from 'react';
import { X, Plus, Image as ImageIcon, Check } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import type { MediaDetails } from '../../types/media';
import { getReleaseYear } from '../../utils/date';

interface MediaDetailsModalProps {
  media: MediaDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (media: MediaDetails) => void;
  isInLibrary?: boolean;
}

export function MediaDetailsModal({ media, isOpen, onClose, onAdd, isInLibrary = false }: MediaDetailsModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen || !media) return null;

  const year = getReleaseYear(media.releaseDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md">
      <GlassPanel 
        className="relative w-full max-w-4xl max-h-full overflow-hidden flex flex-col md:flex-row"
        tabIndex={-1}
        ref={containerRef}
      >
        {/* Botão Fechar Mobile */}
        <button
          onClick={onClose}
          tabIndex={0}
          className="absolute top-4 right-4 z-20 bg-black/50 text-white hover:text-[var(--color-caramelo-claro)] tv-focus-glow rounded-full p-2 md:hidden"
        >
          <X size={20} />
        </button>

        {/* Poster Lateral */}
        <div className="w-full md:w-1/3 h-64 md:h-auto flex-shrink-0 bg-black relative">
          {media.posterUrl ? (
             <img 
               src={media.posterUrl} 
               alt={media.title}
               className="w-full h-full object-cover"
             />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
              <ImageIcon size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-floresta-negra)] to-transparent md:hidden" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto relative">
          {/* Backdrop Blur como fundo suave para conteúdo */}
          {media.backdropUrl && (
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none bg-cover bg-center"
              style={{ backgroundImage: `url(${media.backdropUrl})` }}
            />
          )}

          {/* Botão Fechar Desktop */}
          <button
            onClick={onClose}
            tabIndex={0}
            className="hidden md:flex absolute top-6 right-6 text-white/60 hover:text-white tv-focus-glow rounded-full p-1 z-20"
          >
            <X size={24} />
          </button>

          <div className="relative z-10 flex flex-col h-full">
            <h2 className="text-3xl md:text-5xl font-cinzel font-bold text-[var(--color-caramelo-claro)] mb-2">
              {media.title}
            </h2>
            
            <div className="flex items-center gap-4 text-sm font-outfit opacity-80 mb-6">
              <span>{year || 'Ano desconhecido'}</span>
              <span className="capitalize">{media.mediaType === 'movie' ? 'Filme' : 'Série'}</span>
              {media.voteAverage && (
                <span className="flex items-center gap-1 text-[var(--color-caramelo-claro)] font-bold">
                  ★ {media.voteAverage.toFixed(1)}
                </span>
              )}
            </div>

            <p className="text-base md:text-lg font-outfit leading-relaxed opacity-90 mb-8 max-w-2xl">
              {media.overview || 'Sinopse não disponível para esta mídia.'}
            </p>

            <div className="mt-auto pt-6 flex gap-4">
              {isInLibrary ? (
                <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-8 py-4 rounded-xl font-bold font-outfit text-lg">
                  <Check size={24} />
                  Já está na sua Biblioteca
                </div>
              ) : (
                <button
                  tabIndex={0}
                  onClick={() => {
                    onAdd(media);
                    onClose();
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] px-8 py-4 rounded-xl font-bold font-outfit text-lg tv-focus-glow hover:bg-[var(--color-cobre)] hover:text-white transition-colors cursor-pointer"
                >
                  <Plus size={24} />
                  Adicionar à Biblioteca
                </button>
              )}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

