import { useEffect, useRef, useState, useMemo } from 'react';
import { X, Plus, Image as ImageIcon, Check, Star, Trash2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import type { MediaDetails } from '../../types/media';
import type { LibraryItem, WishlistStatus } from '../../types/wishlist';
import { getReleaseYear } from '../../utils/date';
import { apiFetch } from '../../lib/api';

interface MediaDetailsModalProps {
  media: MediaDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (media: MediaDetails) => void;
  isInLibrary?: boolean;
  libraryItem?: LibraryItem;
  onRemove?: (item: LibraryItem) => void;
  onStatusChange?: (item: LibraryItem, newStatus: WishlistStatus) => void;
  onEdit?: (item: LibraryItem) => void;
}

export function MediaDetailsModal({
  media,
  isOpen,
  onClose,
  onAdd,
  isInLibrary = false,
  libraryItem,
  onRemove,
  onStatusChange,
  onEdit,
}: MediaDetailsModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [extendedMedia, setExtendedMedia] = useState<MediaDetails | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setExtendedMedia(null);
    if (!isOpen || !media) return;

    // Se já temos a informação de watchProviders (mesmo que seja null), não precisa de fetch extra
    if (media.watchProviders !== undefined) {
      setExtendedMedia(media);
      return;
    }

    let isSubscribed = true;
    setIsLoadingProviders(true);

    apiFetch(`/tmdb/${media.mediaType}/${media.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MediaDetails | null) => {
        if (isSubscribed && data) {
          setExtendedMedia(data);
        }
      })
      .catch((err) => {
        console.error('Falha ao obter provedores de streaming:', err);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoadingProviders(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, media?.id, media?.mediaType, media?.watchProviders]);

  const currentMedia = extendedMedia || media;
  const providers = currentMedia?.watchProviders;

  const uniqueFlatrate = useMemo(() => {
    if (!providers?.flatrate) return [];
    return providers.flatrate.filter(
      (provider, index, self) =>
        index === self.findIndex((p) => p.logoUrl === provider.logoUrl || p.id === provider.id)
    );
  }, [providers?.flatrate]);

  const uniqueRentBuy = useMemo(() => {
    if (!providers) return [];
    const combined = [...(providers.rent || []), ...(providers.buy || [])];
    return combined.filter(
      (provider, index, self) =>
        index === self.findIndex((p) => p.logoUrl === provider.logoUrl || p.id === provider.id)
    );
  }, [providers?.rent, providers?.buy]);

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
          aria-label="Fechar"
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
            aria-label="Fechar modal"
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

            <p className="text-base md:text-lg font-outfit leading-relaxed opacity-90 mb-6 max-w-2xl">
              {media.overview || 'Sinopse não disponível para esta mídia.'}
            </p>

            {/* Seção Onde Assistir (Watch Providers) */}
            <div className="mb-8">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-outfit uppercase tracking-widest text-[var(--color-caramelo-claro)] font-semibold">
                  Onde Assistir
                </span>
                {providers?.link && (
                  <a
                    href={providers.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={0}
                    className="text-xs font-outfit text-white/40 hover:text-[var(--color-caramelo-claro)] transition-colors tv-focus-glow rounded px-1.5 py-0.5"
                    title="Ver detalhes de exibição no JustWatch"
                  >
                    via JustWatch ↗
                  </a>
                )}
              </div>

              {isLoadingProviders ? (
                <div className="flex items-center gap-3 py-1">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
                  <span className="text-xs font-outfit text-white/40">Carregando streamings...</span>
                </div>
              ) : uniqueFlatrate.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  {uniqueFlatrate.map((provider) => (
                    <a
                      key={provider.id}
                      href={providers?.link || '#'}
                      target={providers?.link ? '_blank' : undefined}
                      rel={providers?.link ? 'noopener noreferrer' : undefined}
                      tabIndex={0}
                      title={provider.name}
                      aria-label={provider.name}
                      className="group relative flex items-center justify-center p-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--color-caramelo-claro)] transition-all duration-200 tv-focus-glow"
                    >
                      <img
                        src={provider.logoUrl}
                        alt={provider.name}
                        className="w-10 h-10 md:w-11 md:h-11 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              ) : uniqueRentBuy.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-outfit text-white/50">Disponível para aluguel ou compra:</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {uniqueRentBuy.map((provider) => (
                      <a
                        key={provider.id}
                        href={providers?.link || '#'}
                        target={providers?.link ? '_blank' : undefined}
                        rel={providers?.link ? 'noopener noreferrer' : undefined}
                        tabIndex={0}
                        title={provider.name}
                        aria-label={provider.name}
                        className="group relative flex items-center justify-center p-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--color-caramelo-claro)] transition-all duration-200 tv-focus-glow"
                      >
                        <img
                          src={provider.logoUrl}
                          alt={provider.name}
                          className="w-10 h-10 md:w-11 md:h-11 rounded-lg object-cover shadow-sm group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-outfit italic text-white/50 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 w-fit">
                  Não disponível em streaming no Brasil no momento
                </p>
              )}
            </div>

            <div className="mt-auto pt-4 flex gap-4">
              {isInLibrary && libraryItem ? (
                <div className="flex-1 md:flex-none flex flex-col md:flex-row gap-4 w-full">
                  {libraryItem.status !== 'completed' && onStatusChange && (
                    <button
                      tabIndex={0}
                      onClick={() => {
                        onStatusChange(libraryItem, 'completed');
                        onClose();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-6 py-4 rounded-xl font-bold font-outfit text-base lg:text-lg tv-focus-glow hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <Check size={20} />
                      Concluir
                    </button>
                  )}
                  {onEdit && (
                    <button
                      tabIndex={0}
                      onClick={() => {
                        onClose();
                        onEdit(libraryItem);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-caramelo-claro)] text-black px-6 py-4 rounded-xl font-bold font-outfit text-base lg:text-lg tv-focus-glow hover:bg-[var(--color-cobre)] hover:text-white transition-colors cursor-pointer"
                    >
                      <Star size={20} className="fill-current" />
                      Avaliar
                    </button>
                  )}
                  {onRemove && (
                    <button
                      tabIndex={0}
                      onClick={() => {
                        onRemove(libraryItem);
                        onClose();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 px-6 py-4 rounded-xl font-bold font-outfit text-base lg:text-lg tv-focus-glow hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <Trash2 size={20} />
                      Remover
                    </button>
                  )}
                </div>
              ) : isInLibrary ? (
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
