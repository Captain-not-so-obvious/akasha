import { useEffect, useRef, useState, useMemo } from 'react';
import { X, Image as ImageIcon, Check, Star, Trash2, Play, Bookmark } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { StatusBadge } from './StatusBadge';
import type { MediaDetails } from '../../types/media';
import type { LibraryItem, WishlistStatus } from '../../types/wishlist';
import { getReleaseYear } from '../../utils/date';
import { apiFetch } from '../../lib/api';

interface MediaDetailsModalProps {
  media: MediaDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (media: MediaDetails, status?: WishlistStatus) => void;
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

    // Se já temos a informação de watchProviders carregada (objeto populado), não precisa de fetch extra
    if (media.watchProviders) {
      setExtendedMedia(media);
      return;
    }

    // Se o item pertencer ao domínio de games ou livros, não consulta TMDB
    if (libraryItem?.domain === 'game' || libraryItem?.domain === 'book') {
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
  }, [isOpen, media]);

  const currentMedia = extendedMedia || media;
  const providers = currentMedia?.watchProviders;

  const uniqueFlatrate = useMemo(() => {
    if (!providers?.flatrate) return [];
    return providers.flatrate.filter(
      (provider, index, self) =>
        index === self.findIndex((p) => p.logoUrl === provider.logoUrl || p.id === provider.id)
    );
  }, [providers]);

  const uniqueRentBuy = useMemo(() => {
    if (!providers?.rent && !providers?.buy) return [];
    const combined = [...(providers.rent || []), ...(providers.buy || [])];
    return combined.filter(
      (provider, index, self) =>
        index === self.findIndex((p) => p.logoUrl === provider.logoUrl || p.id === provider.id)
    );
  }, [providers]);

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

            {/* Motivo da Recomendação (quando veio de ML do Akasha) */}
            {media.reason && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-[var(--color-seda-milharal)] mb-4 max-w-2xl">
                <span className="text-base leading-none select-none">💡</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-cinzel font-semibold text-yellow-400 uppercase tracking-wider">
                    Por que o Akasha recomenda este título?
                  </span>
                  <p className="text-xs font-outfit text-[var(--color-seda-milharal)]/90 leading-relaxed">
                    {media.reason}
                  </p>
                </div>
              </div>
            )}

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
                <div className="flex flex-col gap-3 w-full">
                  {/* Status atual do item na biblioteca */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                        <Check size={14} />
                      </span>
                      <p className="text-xs md:text-sm font-outfit font-bold text-white">Já está na sua Biblioteca</p>
                      <div className="ml-1">
                        <StatusBadge status={libraryItem.status} domain={libraryItem.domain || 'movie'} />
                      </div>
                    </div>
                    {libraryItem.userRating && (
                      <div className="flex items-center gap-1.5 text-xs font-outfit text-[var(--color-caramelo-claro)]">
                        <Star size={14} className="fill-current" />
                        <span className="font-bold">{libraryItem.userRating}/5</span>
                      </div>
                    )}
                  </div>

                  {/* Todas as Ações Unificadas no Mesmo Lugar */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 w-full">
                    {/* 1. Começar a Assistir / Jogar / Ler */}
                    {libraryItem.status !== 'watching' && onStatusChange && (
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={() => {
                          onStatusChange(libraryItem, 'watching');
                          onClose();
                        }}
                        className="col-span-2 sm:flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-[var(--color-caramelo-claro)] text-black px-4 py-2.5 rounded-xl font-bold font-outfit text-sm tv-focus-glow hover:bg-[var(--color-cobre)] hover:text-white transition-all shadow-md shadow-yellow-900/20 cursor-pointer"
                        aria-label={
                          libraryItem.status === 'completed'
                            ? libraryItem.domain === 'game' ? 'Jogar Novamente' : libraryItem.domain === 'book' ? 'Ler Novamente' : 'Assistir Novamente'
                            : libraryItem.domain === 'game' ? 'Começar a Jogar' : libraryItem.domain === 'book' ? 'Começar a Ler' : 'Começar a Assistir'
                        }
                      >
                        <Play size={18} className="fill-current shrink-0" />
                        <span>
                          {libraryItem.status === 'completed'
                            ? libraryItem.domain === 'game' ? 'Jogar Novamente' : libraryItem.domain === 'book' ? 'Ler Novamente' : 'Assistir Novamente'
                            : libraryItem.domain === 'game' ? 'Começar a Jogar' : libraryItem.domain === 'book' ? 'Começar a Ler' : 'Começar a Assistir'}
                        </span>
                      </button>
                    )}

                    {/* 2. Concluir / Zerar / Lido */}
                    {libraryItem.status !== 'completed' && onStatusChange && (
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={() => {
                          onStatusChange(libraryItem, 'completed');
                          onClose();
                        }}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl font-bold font-outfit text-sm tv-focus-glow hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                        aria-label={libraryItem.domain === 'game' ? 'Marcar como Zerado' : libraryItem.domain === 'book' ? 'Marcar como Lido' : 'Concluir'}
                      >
                        <Check size={18} className="shrink-0" />
                        <span>{libraryItem.domain === 'game' ? 'Marcar como Zerado' : libraryItem.domain === 'book' ? 'Marcar como Lido' : 'Concluir'}</span>
                      </button>
                    )}

                    {/* 3. Avaliar */}
                    {onEdit && (
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={() => {
                          onClose();
                          onEdit(libraryItem);
                        }}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-xl font-bold font-outfit text-sm tv-focus-glow hover:bg-[var(--color-caramelo-claro)] hover:text-black transition-all cursor-pointer"
                        aria-label="Avaliar"
                      >
                        <Star size={18} className="fill-current text-[var(--color-caramelo-claro)] shrink-0" />
                        <span>{libraryItem.userRating ? 'Reavaliar' : 'Avaliar'}</span>
                      </button>
                    )}

                    {/* 4. Remover */}
                    {onRemove && (
                      <button
                        type="button"
                        tabIndex={0}
                        onClick={() => {
                          onRemove(libraryItem);
                          onClose();
                        }}
                        className="col-span-2 sm:col-span-1 sm:w-auto min-h-[44px] flex items-center justify-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2.5 rounded-xl font-bold font-outfit text-sm tv-focus-glow hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                        aria-label="Remover"
                      >
                        <Trash2 size={18} className="shrink-0" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : isInLibrary ? (
                <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-8 py-4 rounded-xl font-bold font-outfit text-lg">
                  <Check size={24} />
                  Já está na sua Biblioteca
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <span className="text-xs font-outfit text-[var(--color-seda-milharal)]/70">
                    Adicionar à sua Biblioteca:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => {
                        onAdd(media);
                        onClose();
                      }}
                      aria-label="Adicionar à Biblioteca"
                      className="min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-outfit font-semibold text-sm tv-focus-glow transition cursor-pointer"
                    >
                      <Bookmark size={18} className="text-[var(--color-caramelo-claro)]" />
                      <span>Quero Ver</span>
                    </button>

                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => {
                        onAdd(media, 'watching');
                        onClose();
                      }}
                      className="min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--color-caramelo-claro)] text-black font-outfit font-bold text-sm tv-focus-glow hover:bg-[var(--color-cobre)] hover:text-white transition cursor-pointer shadow-md shadow-yellow-900/20"
                    >
                      <Play size={18} className="fill-current" />
                      <span>Começar a Assistir</span>
                    </button>

                    <button
                      type="button"
                      tabIndex={0}
                      onClick={() => {
                        onAdd(media, 'completed');
                        onClose();
                      }}
                      className="min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-500/30 font-outfit font-semibold text-sm tv-focus-glow transition cursor-pointer"
                    >
                      <Check size={18} />
                      <span>Já Assisti</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
