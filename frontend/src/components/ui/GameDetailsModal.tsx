import { useEffect, useRef, useState } from 'react';
import { X, Check, Star, Trash2, Gamepad2, Bookmark, Trophy, Play, Loader2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import type { GameDetails } from '../../types/game';
import type { LibraryItem, WishlistStatus } from '../../types/wishlist';
import { StatusBadge } from './StatusBadge';

interface GameDetailsModalProps {
  game: GameDetails | null;
  isOpen: boolean;
  onClose: () => void;
  isInLibrary?: boolean;
  libraryItem?: LibraryItem;
  onAdd: (game: GameDetails, status: WishlistStatus) => Promise<void> | void;
  onRemove?: (item: LibraryItem) => void;
  onStatusChange?: (item: LibraryItem, newStatus: WishlistStatus) => void;
}

const FALLBACK_COVER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='267' viewBox='0 0 200 267'%3E%3Crect width='200' height='267' fill='%231b281f'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23dda15e' font-size='14' font-family='sans-serif'%3ESem Capa%3C/text%3E%3C/svg%3E`;

/**
 * Modal de detalhes de Jogo com sinopse, plataformas, notas e ações de biblioteca.
 *
 * Acessibilidade e Plataformas:
 * - Android TV / D-Pad: Todos os botões possuem tabIndex={0} e tv-focus-glow.
 *   Foco automático no container ao abrir e tecla Escape fecha o modal.
 * - Mobile: Scroll suave, botões de ação com toque amplo (mínimo 44px).
 * - Feedback Visual: Estado de espera com loader nos botões ao adicionar à biblioteca
 *   e transição suave para "Já está na sua Biblioteca", espelhando o comportamento de cinema/séries.
 */
export function GameDetailsModal({
  game,
  isOpen,
  onClose,
  isInLibrary = false,
  libraryItem,
  onRemove,
  onStatusChange,
  onAdd,
}: GameDetailsModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [addingStatus, setAddingStatus] = useState<WishlistStatus | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<WishlistStatus | null>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.focus();
    }
  }, [isOpen]);

  // Reseta estado otimista quando o jogo selecionado mudar ou ao fechar
  useEffect(() => {
    setAddingStatus(null);
    setOptimisticStatus(null);
  }, [game?.id, isOpen]);

  if (!isOpen || !game) return null;

  const formattedRating = game.rating ? (game.rating / 10).toFixed(1) : null;
  const isCurrentlyInLibrary = isInLibrary || Boolean(optimisticStatus);
  const effectiveStatus = libraryItem?.status || optimisticStatus;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleAddWithStatus = async (status: WishlistStatus) => {
    if (addingStatus) return;

    if (status === 'completed') {
      onAdd(game, 'completed');
      return;
    }

    try {
      setAddingStatus(status);
      await onAdd(game, status);
      setOptimisticStatus(status);
    } catch (err) {
      console.error('Falha ao adicionar jogo à biblioteca:', err);
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
      aria-labelledby="game-modal-title"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="w-full max-w-3xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassPanel className="relative overflow-hidden flex flex-col max-h-[90vh] border border-white/20 shadow-2xl p-0">
          {/* Banner de fundo com gradiente */}
          <div className="relative w-full h-44 sm:h-56 bg-[var(--color-floresta-negra)] overflow-hidden shrink-0">
            {game.backdropUrl ? (
              <img
                src={game.backdropUrl}
                alt=""
                className="w-full h-full object-cover opacity-40 scale-105 filter blur-xs"
              />
            ) : game.coverUrl ? (
              <img
                src={game.coverUrl}
                alt=""
                className="w-full h-full object-cover opacity-25 filter blur-md"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-floresta-negra)] via-[var(--color-floresta-negra)]/60 to-transparent" />

            {/* Botão Fechar */}
            <button
              onClick={onClose}
              tabIndex={0}
              aria-label="Fechar detalhes"
              className="tv-focus-glow absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo com scroll */}
          <div className="relative px-6 pb-6 pt-0 -mt-20 overflow-y-auto flex-1 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Capa */}
              <div className="w-28 sm:w-36 aspect-[3/4] shrink-0 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black/40">
                <img
                  src={game.coverUrl ?? FALLBACK_COVER}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Cabeçalho de informações */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-folha-oliva)] text-[var(--color-seda-milharal)]">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    Jogo
                  </span>
                  {game.releaseYear && (
                    <span className="text-xs font-outfit text-[var(--color-caramelo-claro)] font-medium">
                      {game.releaseYear}
                    </span>
                  )}
                  {formattedRating && (
                    <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-black/50 px-2 py-0.5 rounded-md">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      {formattedRating} / 10
                    </span>
                  )}
                </div>

                <h2
                  id="game-modal-title"
                  className="font-cinzel text-2xl sm:text-3xl font-bold text-[var(--color-caramelo-claro)] leading-tight"
                >
                  {game.title}
                </h2>

                {/* Gêneros */}
                {game.genres && game.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {game.genres.map((genre) => (
                      <span
                        key={genre}
                        className="text-xs font-outfit px-2 py-0.5 rounded-md bg-white/10 text-[var(--color-seda-milharal)]/90"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Plataformas */}
                {game.platforms && game.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {game.platforms.map((plat) => (
                      <span
                        key={plat}
                        className="text-[11px] font-outfit px-2 py-0.5 rounded bg-[var(--color-caramelo-claro)]/15 text-[var(--color-caramelo-claro)] border border-[var(--color-caramelo-claro)]/25"
                      >
                        {plat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sinopse / Resumo */}
            {game.summary && (
              <div className="flex flex-col gap-1.5 bg-white/[0.03] p-4 rounded-xl border border-white/5">
                <h3 className="font-outfit text-xs font-semibold text-[var(--color-caramelo-claro)] uppercase tracking-wider">
                  Sinopse
                </h3>
                <p className="font-outfit text-sm text-[var(--color-seda-milharal)]/90 leading-relaxed max-h-48 overflow-y-auto">
                  {game.summary}
                </p>
              </div>
            )}

            {/* Barra de Ações de Biblioteca */}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-3">
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
                          <StatusBadge status={effectiveStatus} domain="game" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {effectiveStatus === 'plan_to_watch' && onStatusChange && libraryItem && (
                      <button
                        onClick={() => onStatusChange(libraryItem, 'watching')}
                        tabIndex={0}
                        className="tv-focus-glow flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] font-outfit text-xs font-bold hover:brightness-110 transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Começar a Jogar
                      </button>
                    )}

                    {effectiveStatus === 'watching' && onStatusChange && libraryItem && (
                      <button
                        onClick={() => onStatusChange(libraryItem, 'completed')}
                        tabIndex={0}
                        className="tv-focus-glow flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-outfit text-xs font-bold hover:bg-emerald-500 transition cursor-pointer"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        Marcar como Zerado
                      </button>
                    )}

                    {libraryItem && onRemove && (
                      <button
                        onClick={() => onRemove(libraryItem)}
                        tabIndex={0}
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
                  <span className="text-xs font-outfit text-[var(--color-seda-milharal)]/70">
                    Adicionar à sua Biblioteca:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleAddWithStatus('plan_to_watch')}
                      disabled={addingStatus !== null}
                      tabIndex={0}
                      aria-busy={addingStatus === 'plan_to_watch'}
                      className="tv-focus-glow flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--color-caramelo-claro)] text-[var(--color-floresta-negra)] font-outfit font-bold text-sm shadow-lg cursor-pointer transition hover:brightness-110 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {addingStatus === 'plan_to_watch' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-floresta-negra)]" />
                          <span>Adicionando...</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>Quero Jogar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleAddWithStatus('watching')}
                      disabled={addingStatus !== null}
                      tabIndex={0}
                      aria-busy={addingStatus === 'watching'}
                      className="tv-focus-glow flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-[var(--color-seda-milharal)] border border-white/15 font-outfit font-semibold text-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingStatus === 'watching' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-caramelo-claro)]" />
                          <span>Iniciando...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Jogando Agora</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleAddWithStatus('completed')}
                      disabled={addingStatus !== null}
                      tabIndex={0}
                      className="tv-focus-glow flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-outfit font-semibold text-sm transition cursor-pointer border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Já Zerei</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
