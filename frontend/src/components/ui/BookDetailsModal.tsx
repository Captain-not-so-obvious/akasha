import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Star, Trash2, BookOpen, Bookmark, Play, FileText, Building2, Tag, Loader2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { apiFetch } from '../../lib/api';
import type { BookDetails } from '../../types/book';
import type { LibraryItem, WishlistStatus } from '../../types/wishlist';
import { StatusBadge } from './StatusBadge';

interface BookDetailsModalProps {
  book: BookDetails | null;
  isOpen: boolean;
  onClose: () => void;
  isInLibrary?: boolean;
  libraryItem?: LibraryItem;
  onAdd: (book: BookDetails, status: WishlistStatus) => Promise<void> | void;
  onRemove?: (item: LibraryItem) => void;
  onStatusChange?: (item: LibraryItem, newStatus: WishlistStatus) => void;
  onEdit?: (item: LibraryItem) => void;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%231b281f'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='sans-serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

/**
 * Modal de detalhes de Livro com sinopse, autores, páginas, editora, ISBN e ações de biblioteca.
 *
 * Acessibilidade e Plataformas:
 * - Android TV / D-Pad: Todos os botões possuem tabIndex={0} e tv-focus-glow.
 *   Foco automático no container ao abrir e tecla Escape fecha o modal.
 * - Mobile: Scroll suave, botões de ação com toque amplo (mínimo 44px).
 * - Feedback Visual: Estado de espera com loader nos botões ao adicionar à estante.
 */
export function BookDetailsModal({
  book,
  isOpen,
  onClose,
  isInLibrary = false,
  libraryItem,
  onRemove,
  onStatusChange,
  onEdit,
  onAdd,
}: BookDetailsModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [addingStatus, setAddingStatus] = useState<WishlistStatus | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<WishlistStatus | null>(null);
  const [canonicalDescription, setCanonicalDescription] = useState<string | null>(null);
  const [isLoadingSynopsis, setIsLoadingSynopsis] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setAddingStatus(null);
    setOptimisticStatus(null);
  }, [book?.id, isOpen]);

  // Carrega a sinopse canônica oficial via API caso ela esteja ausente ou se for idêntica ao motivo da recomendação
  useEffect(() => {
    if (!isOpen || !book?.id) {
      setCanonicalDescription(null);
      setIsLoadingSynopsis(false);
      return;
    }

    const hasValidDescription = Boolean(
      book.description && (!book.reason || book.description.trim() !== book.reason.trim())
    );

    if (hasValidDescription) {
      setCanonicalDescription(book.description || null);
      setIsLoadingSynopsis(false);
      return;
    }

    let isMounted = true;
    setIsLoadingSynopsis(true);

    apiFetch(`/books/${encodeURIComponent(book.id)}`)
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as BookDetails;
          if (isMounted && data.description) {
            setCanonicalDescription(data.description);
          }
        }
      })
      .catch((err) => {
        console.warn('[BookDetailsModal] Falha ao recuperar sinopse canônica do livro:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSynopsis(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, book?.id, book?.description, book?.reason]);

  if (!isOpen || !book) return null;

  const resolvedDescription =
    canonicalDescription ||
    (book.description && (!book.reason || book.description.trim() !== book.reason.trim())
      ? book.description
      : null);

  const formattedRating = book.averageRating ? book.averageRating.toFixed(1) : null;
  const isCurrentlyInLibrary = isInLibrary || Boolean(optimisticStatus);
  const effectiveStatus = libraryItem?.status || optimisticStatus;
  const authorDisplay = book.authors.length > 0 ? book.authors.join(', ') : 'Autor Desconhecido';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleAddWithStatus = async (status: WishlistStatus) => {
    if (addingStatus) return;

    const bookPayload: BookDetails = {
      ...book,
      description: resolvedDescription || undefined,
    };

    if (status === 'completed') {
      onAdd(bookPayload, 'completed');
      return;
    }

    try {
      setAddingStatus(status);
      await onAdd(bookPayload, status);
      setOptimisticStatus(status);
    } catch (err) {
      console.error('Falha ao adicionar livro à estante:', err);
    } finally {
      setAddingStatus(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-modal-title"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="w-full max-w-3xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassPanel
          className="relative max-h-[90vh] flex flex-col overflow-hidden border border-white/20 shadow-2xl rounded-2xl"
        >
          {/* Botão Fechar */}
          <button
            onClick={onClose}
            tabIndex={0}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 text-[var(--color-seda-milharal)] hover:text-white hover:bg-black/80 transition-all tv-focus-glow cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Fechar detalhes do livro"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Conteúdo com Scroll */}
          <div className="overflow-y-auto p-6 md:p-8 flex flex-col gap-6 custom-scrollbar">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Capa com Proporção Editorial */}
              <div className="relative w-36 sm:w-44 shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/10 aspect-[1/1.5] bg-[var(--color-floresta-negra)] mx-auto sm:mx-0">
                <img
                  src={book.coverUrl ?? FALLBACK_COVER}
                  alt={`Capa de ${book.title}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_COVER;
                  }}
                />
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
              </div>

              {/* Informações Principais */}
              <div className="flex-1 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-outfit bg-[var(--color-folha-oliva)]/80 text-[var(--color-seda-milharal)] border border-white/10">
                    <BookOpen className="w-3.5 h-3.5" />
                    Livro
                  </span>

                  {book.releaseYear && (
                    <span className="font-outfit text-sm text-[var(--color-caramelo-claro)] font-medium">
                      {book.releaseYear}
                    </span>
                  )}

                  {effectiveStatus && (
                    <StatusBadge status={effectiveStatus} domain="book" />
                  )}
                </div>

                <h2
                  id="book-modal-title"
                  className="text-2xl sm:text-3xl font-cinzel font-bold text-[var(--color-caramelo-claro)] leading-tight"
                >
                  {book.title}
                </h2>

                {book.subtitle && (
                  <p className="text-sm font-outfit text-stone-300 italic -mt-1">
                    {book.subtitle}
                  </p>
                )}

                <p className="text-base font-outfit text-[var(--color-seda-milharal)] font-medium">
                  {authorDisplay}
                </p>

                {/* Metadados: Editora, Páginas, ISBN */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-outfit text-stone-400 mt-1">
                  {book.publisher && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 opacity-70" />
                      {book.publisher}
                    </span>
                  )}
                  {book.pageCount && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 opacity-70" />
                      {book.pageCount} páginas
                    </span>
                  )}
                  {book.isbn13 && (
                    <span>ISBN: {book.isbn13}</span>
                  )}
                </div>

                {/* Categorias / Gêneros */}
                {book.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {book.categories.slice(0, 4).map((cat) => (
                      <span
                        key={cat}
                        className="flex items-center gap-1 text-[11px] font-outfit px-2 py-0.5 rounded-md bg-white/5 text-stone-300 border border-white/10"
                      >
                        <Tag className="w-2.5 h-2.5 opacity-60" />
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Nota */}
                {formattedRating && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-outfit font-bold text-sm text-white">
                        {formattedRating}
                      </span>
                    </div>
                    {book.ratingsCount && (
                      <span className="text-xs font-outfit text-stone-400">
                        ({book.ratingsCount} avaliações)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Motivo da Recomendação (quando o livro vem de sugestão do Akasha / ML) */}
            {book.reason && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[var(--color-caramelo-claro)]/10 border border-[var(--color-caramelo-claro)]/30 text-[var(--color-seda-milharal)]">
                <span className="text-base leading-none select-none">💡</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-cinzel font-semibold text-[var(--color-caramelo-claro)] uppercase tracking-wider">
                    Por que o Akasha recomenda este livro?
                  </span>
                  <p className="text-xs font-outfit text-[var(--color-seda-milharal)]/90 leading-relaxed">
                    {book.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Sinopse da Obra */}
            {(resolvedDescription || isLoadingSynopsis) && (
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <h3 className="text-sm font-cinzel font-semibold text-[var(--color-caramelo-claro)] uppercase tracking-wider">
                  Sinopse
                </h3>
                {isLoadingSynopsis ? (
                  <div className="flex items-center gap-2 text-stone-400 text-xs font-outfit py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-caramelo-claro)]" />
                    <span>Carregando sinopse oficial da obra...</span>
                  </div>
                ) : (
                  <p className="text-sm font-outfit text-[var(--color-seda-milharal)]/80 leading-relaxed whitespace-pre-line">
                    {resolvedDescription}
                  </p>
                )}
              </div>
            )}

            {/* Painel de Ações */}
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <h3 className="text-xs font-cinzel font-semibold text-stone-400 uppercase tracking-wider">
                Minha Estante de Livros
              </h3>

              {isCurrentlyInLibrary ? (
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-5 h-5 shrink-0" />
                    <span className="font-outfit text-sm font-medium">
                      Este livro já está na sua estante.
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {onStatusChange && libraryItem && (
                      <>
                        {libraryItem.status !== 'watching' && (
                          <button
                            onClick={() => onStatusChange(libraryItem, 'watching')}
                            tabIndex={0}
                            className="tv-focus-glow px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-outfit text-white transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Lendo
                          </button>
                        )}
                        {libraryItem.status !== 'completed' && (
                          <button
                            onClick={() => onStatusChange(libraryItem, 'completed')}
                            tabIndex={0}
                            className="tv-focus-glow px-3 py-2 rounded-lg bg-[var(--color-folha-oliva)] hover:bg-[var(--color-folha-oliva)]/80 text-xs font-outfit text-white font-semibold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Marcar como Lido
                          </button>
                        )}
                      </>
                    )}

                    {onEdit && libraryItem && (
                      <button
                        onClick={() => {
                          onClose();
                          onEdit(libraryItem);
                        }}
                        tabIndex={0}
                        className="tv-focus-glow px-3 py-2 rounded-lg bg-white/10 hover:bg-[var(--color-caramelo-claro)] hover:text-black text-white text-xs font-outfit transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5"
                        aria-label="Avaliar Livro"
                      >
                        <Star className="w-3.5 h-3.5 fill-current text-[var(--color-caramelo-claro)]" />
                        Avaliar
                      </button>
                    )}

                    {onRemove && libraryItem && (
                      <button
                        onClick={() => {
                          onRemove(libraryItem);
                          onClose();
                        }}
                        tabIndex={0}
                        className="tv-focus-glow px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-outfit transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleAddWithStatus('plan_to_watch')}
                    disabled={Boolean(addingStatus)}
                    tabIndex={0}
                    className="tv-focus-glow flex items-center justify-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-[var(--color-seda-milharal)] font-outfit text-sm font-semibold transition-all cursor-pointer min-h-[48px] disabled:opacity-50"
                  >
                    {addingStatus === 'plan_to_watch' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-caramelo-claro)]" />
                    ) : (
                      <Bookmark className="w-4 h-4 text-[var(--color-caramelo-claro)]" />
                    )}
                    Quero Ler
                  </button>

                  <button
                    onClick={() => handleAddWithStatus('watching')}
                    disabled={Boolean(addingStatus)}
                    tabIndex={0}
                    className="tv-focus-glow flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--color-caramelo-claro)]/20 hover:bg-[var(--color-caramelo-claro)]/30 border border-[var(--color-caramelo-claro)]/40 text-[var(--color-caramelo-claro)] font-outfit text-sm font-semibold transition-all cursor-pointer min-h-[48px] disabled:opacity-50"
                  >
                    {addingStatus === 'watching' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    Estou Lendo
                  </button>

                  <button
                    onClick={() => handleAddWithStatus('completed')}
                    disabled={Boolean(addingStatus)}
                    tabIndex={0}
                    className="tv-focus-glow flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--color-folha-oliva)] hover:bg-[var(--color-folha-oliva)]/90 text-white font-outfit text-sm font-semibold transition-all cursor-pointer min-h-[48px] disabled:opacity-50 shadow-lg shadow-[var(--color-folha-oliva)]/20"
                  >
                    <Check className="w-4 h-4" />
                    Já Li (Avaliar)
                  </button>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
