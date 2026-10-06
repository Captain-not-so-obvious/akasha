import { useEffect, useRef, useState } from 'react';
import { X, Check, Star, Trash2, BookOpen, Bookmark, Play, Layers, Building2, Tag, ChevronDown, Loader2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { apiFetch } from '../../lib/api';
import type { ComicDetails, ComicIssueItem } from '../../types/comic';
import type { LibraryItem, WishlistStatus } from '../../types/wishlist';
import { StatusBadge } from './StatusBadge';

interface ComicDetailsModalProps {
  comic: ComicDetails | null;
  isOpen: boolean;
  onClose: () => void;
  isInLibrary?: boolean;
  libraryItem?: LibraryItem;
  onAdd: (comic: ComicDetails, status: WishlistStatus) => Promise<void> | void;
  onRemove?: (item: LibraryItem) => void;
  onStatusChange?: (item: LibraryItem, newStatus: WishlistStatus) => void;
  onEdit?: (item: LibraryItem) => void;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%231b281f'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='sans-serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

/**
 * Modal de detalhes de Saga de Quadrinhos ou Mangá com checklist enumerada das edições/volumes em Toggle interativo.
 *
 * Acessibilidade e Plataformas:
 * - Android TV / D-Pad: Todos os botões e o toggle possuem tabIndex={0} e tv-focus-glow. Tecla Escape fecha.
 * - Mobile: Botões de ação generosos com área de toque mínima de 44px e scroll suave.
 */
export function ComicDetailsModal({
  comic,
  isOpen,
  onClose,
  isInLibrary = false,
  libraryItem,
  onRemove,
  onStatusChange,
  onEdit,
  onAdd,
}: ComicDetailsModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [addingStatus, setAddingStatus] = useState<WishlistStatus | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<WishlistStatus | null>(null);
  const [fullDetails, setFullDetails] = useState<ComicDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showIssuesToggle, setShowIssuesToggle] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setAddingStatus(null);
    setOptimisticStatus(null);
    setShowIssuesToggle(false);
    setFullDetails(comic);
  }, [comic?.id, isOpen]);

  // Carrega os detalhes completos com a checklist enumerada de edições/volumes se necessário
  useEffect(() => {
    if (!isOpen || !comic?.id) {
      setFullDetails(null);
      setIsLoadingDetails(false);
      return;
    }

    if (comic.issues && comic.issues.length > 0) {
      setFullDetails(comic);
      setIsLoadingDetails(false);
      return;
    }

    let isMounted = true;
    setIsLoadingDetails(true);

    apiFetch(`/comics/${encodeURIComponent(comic.id)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Falha HTTP ${res.status}`);
        }
        const data = (await res.json()) as ComicDetails;
        if (isMounted) {
          setFullDetails({
            ...comic,
            ...data,
            title: data.title || comic.title,
            type: data.type || comic.type,
            coverUrl: data.coverUrl || comic.coverUrl,
            description: data.description || comic.description,
            creators: data.creators && data.creators.length > 0 ? data.creators : comic.creators,
            publisher: data.publisher || comic.publisher,
            releaseYear: data.releaseYear ?? comic.releaseYear,
            issues: data.issues && data.issues.length > 0 ? data.issues : comic.issues,
          });
          setIsLoadingDetails(false);
        }
      })
      .catch((err) => {
        console.warn('Falha ao carregar detalhes complementares da obra:', err);
        if (isMounted) {
          setFullDetails(comic);
          setIsLoadingDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [comic?.id, isOpen]);

  if (!isOpen || !comic) return null;

  const libraryMeta = libraryItem?.extraMeta as Record<string, unknown> | null | undefined;

  // Consolidação multi-camadas de dados para nunca perder nenhuma informação da obra
  const activeComic: ComicDetails = {
    ...comic,
    ...fullDetails,
    id: comic.id,
    title: fullDetails?.title || comic.title || libraryItem?.title || 'Obra sem título',
    type: fullDetails?.type || comic.type || ((libraryMeta?.type as any) || 'comic'),
    coverUrl: fullDetails?.coverUrl || comic.coverUrl || libraryItem?.coverUrl || null,
    releaseYear: fullDetails?.releaseYear ?? comic.releaseYear ?? libraryItem?.releaseYear ?? null,
  };

  if (fullDetails?.originalTitle || comic.originalTitle || libraryMeta?.originalTitle) {
    activeComic.originalTitle =
      fullDetails?.originalTitle ||
      comic.originalTitle ||
      (typeof libraryMeta?.originalTitle === 'string' ? libraryMeta.originalTitle : undefined);
  }
  if (
    fullDetails?.description ||
    comic.description ||
    libraryMeta?.description ||
    libraryMeta?.summary ||
    libraryItem?.media?.overview
  ) {
    activeComic.description =
      fullDetails?.description ||
      comic.description ||
      (typeof libraryMeta?.description === 'string' ? libraryMeta.description : undefined) ||
      (typeof libraryMeta?.summary === 'string' ? libraryMeta.summary : undefined) ||
      libraryItem?.media?.overview;
  }
  if (fullDetails?.publisher || comic.publisher || libraryMeta?.publisher) {
    activeComic.publisher =
      fullDetails?.publisher ||
      comic.publisher ||
      (typeof libraryMeta?.publisher === 'string' ? libraryMeta.publisher : undefined);
  }
  const effectiveCreators =
    (fullDetails?.creators && fullDetails.creators.length > 0 ? fullDetails.creators : undefined) ||
    (comic.creators && comic.creators.length > 0 ? comic.creators : undefined) ||
    (Array.isArray(libraryMeta?.creators) ? (libraryMeta.creators as string[]) : undefined);
  if (effectiveCreators) {
    activeComic.creators = effectiveCreators;
  }
  const effectiveGenres =
    (fullDetails?.genres && fullDetails.genres.length > 0 ? fullDetails.genres : undefined) ||
    (comic.genres && comic.genres.length > 0 ? comic.genres : undefined) ||
    (Array.isArray(libraryMeta?.genres) ? (libraryMeta.genres as string[]) : undefined);
  if (effectiveGenres) {
    activeComic.genres = effectiveGenres;
  }
  const effVolume =
    fullDetails?.volumeCount ??
    comic.volumeCount ??
    (typeof libraryMeta?.volumeCount === 'number' ? libraryMeta.volumeCount : undefined);
  if (effVolume !== undefined) activeComic.volumeCount = effVolume;
  const effIssue =
    fullDetails?.issueCount ??
    comic.issueCount ??
    (typeof libraryMeta?.issueCount === 'number' ? libraryMeta.issueCount : undefined);
  if (effIssue !== undefined) activeComic.issueCount = effIssue;
  const effChapter =
    fullDetails?.chapterCount ??
    comic.chapterCount ??
    (typeof libraryMeta?.chapterCount === 'number' ? libraryMeta.chapterCount : undefined);
  if (effChapter !== undefined) activeComic.chapterCount = effChapter;
  const effIssues =
    (fullDetails?.issues && fullDetails.issues.length > 0 ? fullDetails.issues : undefined) ||
    (comic.issues && comic.issues.length > 0 ? comic.issues : undefined) ||
    (Array.isArray(libraryMeta?.issues) ? (libraryMeta.issues as ComicIssueItem[]) : undefined);
  if (effIssues) activeComic.issues = effIssues;

  const isCurrentlyInLibrary = isInLibrary || Boolean(libraryItem) || Boolean(optimisticStatus);
  const effectiveStatus = optimisticStatus ?? libraryItem?.status;

  const creatorsDisplay =
    activeComic.creators && activeComic.creators.length > 0
      ? activeComic.creators.join(', ')
      : activeComic.publisher || 'Criador Não Informado';

  const typeLabel =
    activeComic.type === 'manhwa' ? 'Manhwa' : activeComic.type === 'manga' ? 'Mangá' : 'Saga / HQ';

  const issuesList: ComicIssueItem[] = activeComic.issues || [];
  const hasIssues = issuesList.length > 0;

  const handleAddWithStatus = async (status: WishlistStatus) => {
    if (addingStatus) return;

    if (status === 'completed') {
      onAdd(activeComic, 'completed');
      return;
    }

    try {
      setAddingStatus(status);
      await onAdd(activeComic, status);
      setOptimisticStatus(status);
    } catch (err) {
      console.error('Falha ao adicionar à estante:', err);
    } finally {
      setAddingStatus(null);
    }
  };

  const handleStatusUpdate = async (status: WishlistStatus) => {
    setOptimisticStatus(status);
    if (libraryItem && onStatusChange) {
      onStatusChange(libraryItem, status);
    } else {
      await onAdd(activeComic, status);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comic-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto outline-none focus:outline-none custom-scrollbar"
      >
        <GlassPanel className="relative p-6 border-white/20 shadow-2xl bg-[#1b281f]/95">
          {/* Botão Fechar */}
          <button
            type="button"
            tabIndex={0}
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="tv-focus-glow absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Capa */}
            <div className="w-full md:w-48 shrink-0 flex flex-col items-center">
              <div className="relative aspect-[1/1.5] w-44 rounded-xl overflow-hidden shadow-2xl bg-black/40 border border-white/10">
                <img
                  src={activeComic.coverUrl ?? FALLBACK_COVER}
                  alt={`Capa de ${activeComic.title}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_COVER;
                  }}
                />
                <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
              </div>

              {/* Status Atual na Biblioteca */}
              {isCurrentlyInLibrary && effectiveStatus && (
                <div className="mt-3 flex flex-col items-center gap-1.5 w-full animate-fade-in">
                  <StatusBadge status={effectiveStatus} domain="comic" />
                  {libraryItem?.userRating && (
                    <div className="flex items-center gap-1 text-xs text-yellow-400 font-semibold font-outfit">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      <span>{libraryItem.userRating} / 5</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Metadados e Informações */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--color-folha-oliva)] text-[var(--color-seda-milharal)]">
                    {typeLabel}
                  </span>
                  {activeComic.releaseYear && (
                    <span className="text-xs text-stone-400 font-outfit">
                      {activeComic.releaseYear}
                    </span>
                  )}
                  {activeComic.publisher && (
                    <span className="flex items-center gap-1 text-xs text-[var(--color-caramelo-claro)] font-outfit">
                      <Building2 className="w-3 h-3" />
                      {activeComic.publisher}
                    </span>
                  )}
                </div>

                <h2
                  id="comic-modal-title"
                  className="text-xl md:text-2xl font-bold font-cinzel text-[var(--color-seda-milharal)] leading-tight"
                >
                  {activeComic.title}
                </h2>

                {activeComic.originalTitle && (
                  <p className="text-xs text-stone-400 italic font-outfit mt-0.5">
                    {activeComic.originalTitle}
                  </p>
                )}

                <p className="text-xs text-[var(--color-caramelo-claro)] font-outfit mt-1">
                  Criadores: <span className="text-white/90">{creatorsDisplay}</span>
                </p>

                {/* Volumes / Edições */}
                <div className="flex items-center gap-3 mt-2 text-xs font-outfit text-stone-300">
                  {activeComic.issueCount && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[var(--color-caramelo-claro)]" />
                      {activeComic.issueCount} Edições na Saga
                    </span>
                  )}
                  {activeComic.volumeCount && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[var(--color-caramelo-claro)]" />
                      {activeComic.volumeCount} Volumes Totais
                    </span>
                  )}
                  {activeComic.chapterCount && (
                    <span className="text-stone-400">
                      • {activeComic.chapterCount} Capítulos
                    </span>
                  )}
                </div>

                {/* Gêneros */}
                {activeComic.genres && activeComic.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {activeComic.genres.slice(0, 4).map((g) => (
                      <span
                        key={g}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-white/5 border border-white/10 text-stone-300"
                      >
                        <Tag className="w-2.5 h-2.5 text-[var(--color-caramelo-claro)] opacity-70" />
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Sinopse */}
                <div className="mt-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                    {activeComic.type === 'manga'
                      ? 'Sinopse do Mangá'
                      : activeComic.type === 'manhwa'
                        ? 'Sinopse do Manhwa'
                        : 'Sinopse da Saga'}
                  </h4>
                  <p className="text-xs md:text-sm text-stone-300 leading-relaxed max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {activeComic.description || 'Sinopse não disponível para esta edição.'}
                  </p>
                </div>

                {/* TOGGLE INTERATIVO DE EDIÇÕES DA SAGA / VOLUMES DO MANGÁ */}
                <div className="mt-4 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => setShowIssuesToggle(!showIssuesToggle)}
                    className="tv-focus-glow flex items-center justify-between w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
                  >
                    <span className="flex items-center gap-2 font-outfit font-semibold text-xs md:text-sm text-[var(--color-seda-milharal)]">
                      <Layers className="w-4 h-4 text-[var(--color-caramelo-claro)]" />
                      {activeComic.type === 'manga'
                        ? hasIssues
                          ? showIssuesToggle
                            ? 'Ocultar Volumes do Mangá'
                            : `Ver Volumes do Mangá (${issuesList.length} itens)`
                          : isLoadingDetails
                            ? 'Carregando lista de volumes...'
                            : 'Lista de Volumes do Mangá'
                        : activeComic.type === 'manhwa'
                          ? hasIssues
                            ? showIssuesToggle
                              ? 'Ocultar Volumes do Manhwa'
                              : `Ver Volumes do Manhwa (${issuesList.length} itens)`
                            : isLoadingDetails
                              ? 'Carregando lista de volumes...'
                              : 'Lista de Volumes do Manhwa'
                          : hasIssues
                            ? showIssuesToggle
                              ? 'Ocultar Edições da Saga'
                              : `Ver Edições da Saga (${issuesList.length} itens)`
                            : isLoadingDetails
                              ? 'Carregando lista de edições...'
                              : 'Lista de Edições da Saga'}
                    </span>
                    {isLoadingDetails ? (
                      <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                    ) : (
                      <ChevronDown
                        className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${showIssuesToggle ? 'rotate-180' : ''}`}
                      />
                    )}
                  </button>

                  {showIssuesToggle && (
                    <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar animate-fade-in">
                      {hasIssues ? (
                        issuesList.map((iss) => (
                          <div
                            key={iss.id}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-black/40 border border-white/5 text-xs font-outfit text-stone-300"
                          >
                            <span className="font-bold text-[var(--color-caramelo-claro)] shrink-0">
                              #{iss.issueNumber || '•'}
                            </span>
                            <span className="truncate">{iss.name}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-400 italic p-2">
                          Edições individuais não detalhadas pelo catálogo.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de Ações de Biblioteca com Tag de Status e Confirmação */}
              <div className="mt-5 border-t border-white/10 pt-4 flex flex-col gap-2.5">
                {isCurrentlyInLibrary ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                        <Check className="w-5 h-5" />
                      </span>
                      <div>
                        <p className="text-sm font-outfit font-bold text-white">Já está na sua Biblioteca</p>
                        {effectiveStatus && (
                          <div className="mt-0.5">
                            <StatusBadge status={effectiveStatus} domain="comic" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {effectiveStatus !== 'watching' && (
                        <button
                          type="button"
                          tabIndex={0}
                          onClick={() => handleStatusUpdate('watching')}
                          className="tv-focus-glow flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] font-outfit text-xs font-bold hover:brightness-110 transition cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {effectiveStatus === 'completed' ? 'Ler Novamente' : 'Começar a Ler'}
                        </button>
                      )}

                      {effectiveStatus !== 'completed' && (
                        <button
                          type="button"
                          tabIndex={0}
                          onClick={() => handleStatusUpdate('completed')}
                          className="tv-focus-glow flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-outfit text-xs font-bold hover:bg-emerald-500 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Marcar como Lido
                        </button>
                      )}

                      {onEdit && libraryItem && (
                        <button
                          type="button"
                          tabIndex={0}
                          onClick={() => {
                            onClose();
                            onEdit(libraryItem);
                          }}
                          className="tv-focus-glow flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 text-white border border-white/20 font-outfit text-xs font-semibold hover:bg-[var(--color-caramelo-claro)] hover:text-black transition cursor-pointer"
                          aria-label={activeComic.type === 'comic' ? 'Avaliar Saga' : 'Avaliar Mangá'}
                        >
                          <Star className="w-3.5 h-3.5 fill-current text-[var(--color-caramelo-claro)]" />
                          Avaliar
                        </button>
                      )}

                      {libraryItem && onRemove && (
                        <button
                          type="button"
                          tabIndex={0}
                          onClick={() => {
                            onRemove(libraryItem);
                            setOptimisticStatus(null);
                          }}
                          className="tv-focus-glow flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 font-outfit text-xs font-semibold hover:bg-red-500/30 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-outfit text-[var(--color-seda-milharal)]/70 font-semibold">
                      Adicionar à sua Biblioteca:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddWithStatus('plan_to_watch')}
                        disabled={addingStatus !== null}
                        tabIndex={0}
                        aria-busy={addingStatus === 'plan_to_watch'}
                        className="tv-focus-glow flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] font-outfit font-bold text-sm shadow-lg cursor-pointer transition hover:brightness-110 disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {addingStatus === 'plan_to_watch' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>Adicionando...</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 shrink-0" />
                            <span>Quero Ler</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddWithStatus('watching')}
                        disabled={addingStatus !== null}
                        tabIndex={0}
                        aria-busy={addingStatus === 'watching'}
                        className="tv-focus-glow flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-outfit font-semibold text-sm transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {addingStatus === 'watching' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>Iniciando...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 shrink-0 fill-current" />
                            <span>Lendo Agora</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddWithStatus('completed')}
                        disabled={addingStatus !== null}
                        tabIndex={0}
                        aria-busy={addingStatus === 'completed'}
                        className="tv-focus-glow flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 font-outfit font-semibold text-sm transition cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {addingStatus === 'completed' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>Concluindo...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 shrink-0" />
                            <span>Já Li</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
