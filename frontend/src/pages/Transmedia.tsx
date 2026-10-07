import React, { useState, useEffect, useMemo } from 'react';
import { GrandArchiveDashboard } from '../components/transmedia/GrandArchiveDashboard';
import { TransmediaRail } from '../components/transmedia/TransmediaRail';
import { useTransmedia } from '../hooks/useTransmedia';
import { useWishlist } from '../hooks/useWishlist';
import type { TransmediaRecommendationItem, CanonicalFranchiseSummary } from '../types/transmedia';
import type { MediaDetails } from '../types/media';
import type { GameDetails } from '../types/game';
import type { BookDetails } from '../types/book';
import type { ComicDetails } from '../types/comic';
import type { LibraryItem, WishlistStatus } from '../types/wishlist';
import { MediaDetailsModal } from '../components/ui/MediaDetailsModal';
import { GameDetailsModal } from '../components/ui/GameDetailsModal';
import { BookDetailsModal } from '../components/ui/BookDetailsModal';
import { ComicDetailsModal } from '../components/ui/ComicDetailsModal';
import { RatingModal } from '../components/ui/RatingModal';
import { Sparkles, BarChart3, Compass, Layers } from 'lucide-react';
import { apiFetch } from '../lib/api';

type ActiveTab = 'dashboard' | 'connections' | 'universes';

export const TransmediaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { franchises, fetchFranchises } = useTransmedia();
  const { items, fetchWishlist, addToList, updateListItem, removeFromList } = useWishlist();

  // Modais de detalhes
  const [selectedMedia, setSelectedMedia] = useState<MediaDetails | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameDetails | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookDetails | null>(null);
  const [selectedComic, setSelectedComic] = useState<ComicDetails | null>(null);

  // Estados de Avaliação (RatingModal)
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [pendingRatingMedia, setPendingRatingMedia] = useState<MediaDetails | null>(null);
  const [pendingRatingGame, setPendingRatingGame] = useState<GameDetails | null>(null);
  const [pendingRatingBook, setPendingRatingBook] = useState<BookDetails | null>(null);
  const [pendingRatingComic, setPendingRatingComic] = useState<ComicDetails | null>(null);
  const [editingLibraryItem, setEditingLibraryItem] = useState<LibraryItem | null>(null);

  useEffect(() => {
    fetchFranchises();
    fetchWishlist();
  }, [fetchFranchises, fetchWishlist]);

  // Mapas da biblioteca para sincronização imediata
  const libraryGameMap = useMemo(() => {
    const map = new Map<string, LibraryItem>();
    items.forEach((item) => {
      if (item.domain === 'game' && item.externalId) {
        map.set(String(item.externalId), item);
      }
    });
    return map;
  }, [items]);

  const libraryBookMap = useMemo(() => {
    const map = new Map<string, LibraryItem>();
    items.forEach((item) => {
      if (item.domain === 'book' && item.externalId) {
        map.set(String(item.externalId), item);
      }
    });
    return map;
  }, [items]);

  const libraryComicMap = useMemo(() => {
    const map = new Map<string, LibraryItem>();
    items.forEach((item) => {
      if (item.domain === 'comic' && item.externalId) {
        map.set(String(item.externalId), item);
      }
    });
    return map;
  }, [items]);

  const selectedMediaLibraryItem = useMemo(() => {
    if (!selectedMedia) return undefined;
    return items.find(
      (item) =>
        (item.domain === 'movie' || item.domain === 'tv' || !item.domain) &&
        (item.tmdbId === selectedMedia.id || item.externalId === String(selectedMedia.id)) &&
        (!item.mediaType || item.mediaType === selectedMedia.mediaType)
    );
  }, [items, selectedMedia]);

  const selectedGameLibraryItem = useMemo(() => {
    if (!selectedGame) return undefined;
    return libraryGameMap.get(String(selectedGame.id));
  }, [selectedGame, libraryGameMap]);

  const selectedBookLibraryItem = useMemo(() => {
    if (!selectedBook) return undefined;
    return libraryBookMap.get(String(selectedBook.id));
  }, [selectedBook, libraryBookMap]);

  const selectedComicLibraryItem = useMemo(() => {
    if (!selectedComic) return undefined;
    return libraryComicMap.get(String(selectedComic.id));
  }, [selectedComic, libraryComicMap]);

  const isTitleConsistent = (sourceTitle: string, candidateTitle?: string | null): boolean => {
    if (!candidateTitle) return true;
    const cleanSource = sourceTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCandidate = candidateTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanSource || !cleanCandidate) return true;
    return (
      cleanSource.includes(cleanCandidate) ||
      cleanCandidate.includes(cleanSource) ||
      cleanSource.slice(0, 4) === cleanCandidate.slice(0, 4)
    );
  };

  const handleSelectRecommendation = async (rec: TransmediaRecommendationItem) => {
    const { targetItem } = rec;

    if (targetItem.domain === 'movie' || targetItem.domain === 'tv') {
      const type = targetItem.mediaType || (targetItem.domain === 'tv' ? 'tv' : 'movie');
      try {
        const res = await apiFetch(`/tmdb/${type}/${targetItem.externalId}`);
        if (res.ok) {
          const data = await res.json();
          if (isTitleConsistent(targetItem.title, data.title || data.name)) {
            setSelectedMedia(data);
            return;
          }
        }
      } catch {}
      // Fallback básico para modal se a API externa demorar ou divergir
      setSelectedMedia({
        id: Number(targetItem.externalId) || 0,
        title: targetItem.title,
        overview: targetItem.overview || '',
        posterUrl: targetItem.coverUrl,
        backdropUrl: null,
        releaseDate: targetItem.releaseYear ? `${targetItem.releaseYear}-01-01` : '',
        mediaType: type,
        voteAverage: 8.0,
      });
    } else if (targetItem.domain === 'game') {
      try {
        const res = await apiFetch(`/games/${targetItem.externalId}`);
        if (res.ok) {
          const data = await res.json();
          if (isTitleConsistent(targetItem.title, data.title)) {
            setSelectedGame(data);
            return;
          }
        }
      } catch {}
      setSelectedGame({
        id: targetItem.externalId,
        title: targetItem.title,
        coverUrl: targetItem.coverUrl,
        backdropUrl: null,
        releaseYear: targetItem.releaseYear,
        genres: ['Ação', 'Aventura'],
        platforms: ['PC', 'PlayStation', 'Xbox'],
        summary: targetItem.overview,
      });
    } else if (targetItem.domain === 'book') {
      try {
        const res = await apiFetch(`/books/${targetItem.externalId}`);
        if (res.ok) {
          const data = await res.json();
          if (isTitleConsistent(targetItem.title, data.title)) {
            setSelectedBook(data);
            return;
          }
        }
      } catch {}
      setSelectedBook({
        id: targetItem.externalId,
        title: targetItem.title,
        authors: targetItem.creatorOrAuthor ? [targetItem.creatorOrAuthor] : ['Autor Desconhecido'],
        coverUrl: targetItem.coverUrl,
        releaseYear: targetItem.releaseYear,
        categories: ['Ficção', 'Literatura'],
        description: targetItem.overview,
      });
    } else if (targetItem.domain === 'comic') {
      try {
        const res = await apiFetch(`/comics/${targetItem.externalId}`);
        if (res.ok) {
          const data = await res.json();
          if (isTitleConsistent(targetItem.title, data.title)) {
            setSelectedComic(data);
            return;
          }
        }
      } catch {}
      setSelectedComic({
        id: targetItem.externalId,
        title: targetItem.title,
        coverUrl: targetItem.coverUrl,
        releaseYear: targetItem.releaseYear,
        publisher: targetItem.creatorOrAuthor || 'Editora',
        type: 'comic',
        creators: targetItem.creatorOrAuthor ? [targetItem.creatorOrAuthor] : [],
        genres: [],
        description: targetItem.overview,
      });
    }
  };

  const handleQuickAdd = async (rec: TransmediaRecommendationItem) => {
    const { targetItem } = rec;
    const isCinemaOrTv = targetItem.domain === 'movie' || targetItem.domain === 'tv';
    await addToList({
      domain: targetItem.domain,
      externalId: targetItem.externalId,
      tmdbId: isCinemaOrTv ? Number(targetItem.externalId) || undefined : undefined,
      mediaType: isCinemaOrTv ? (targetItem.domain === 'tv' ? 'tv' : 'movie') : undefined,
      title: targetItem.title,
      coverUrl: targetItem.coverUrl || undefined,
      posterPath: isCinemaOrTv ? targetItem.coverUrl || undefined : undefined,
      releaseYear: targetItem.releaseYear || undefined,
      status: 'plan_to_watch',
    });
  };

  const handleRatingSubmit = async (rating: number, review?: string) => {
    if (pendingRatingMedia) {
      const media = pendingRatingMedia;
      await addToList({
        tmdbId: media.id,
        mediaType: media.mediaType,
        status: 'completed',
        userRating: rating,
        notes: review,
        title: media.title,
        posterPath: media.posterUrl || undefined,
      });
      setPendingRatingMedia(null);
      setRatingModalOpen(false);
    } else if (pendingRatingGame) {
      const game = pendingRatingGame;
      await addToList({
        domain: 'game',
        externalId: String(game.id),
        status: 'completed',
        userRating: rating,
        notes: review,
        title: game.title,
        coverUrl: game.coverUrl || undefined,
        releaseYear: game.releaseYear || undefined,
        extraMeta: {
          summary: game.summary,
          platforms: game.platforms,
          genres: game.genres,
          rating: game.rating,
          backdropUrl: game.backdropUrl,
          developer: game.developer,
        },
      });
      setPendingRatingGame(null);
      setRatingModalOpen(false);
    } else if (pendingRatingBook) {
      const book = pendingRatingBook;
      await addToList({
        domain: 'book',
        externalId: String(book.id),
        status: 'completed',
        userRating: rating,
        notes: review,
        title: book.title,
        coverUrl: book.coverUrl || undefined,
        releaseYear: book.releaseYear || undefined,
        extraMeta: {
          subtitle: book.subtitle,
          authors: book.authors,
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          pageCount: book.pageCount,
          categories: book.categories,
          isbn10: book.isbn10,
          isbn13: book.isbn13,
          description: book.description,
        },
      });
      setPendingRatingBook(null);
      setRatingModalOpen(false);
    } else if (pendingRatingComic) {
      const comic = pendingRatingComic;
      await addToList({
        domain: 'comic',
        externalId: String(comic.id),
        status: 'completed',
        userRating: rating,
        notes: review,
        title: comic.title,
        coverUrl: comic.coverUrl || undefined,
        releaseYear: comic.releaseYear || undefined,
        extraMeta: {
          type: comic.type,
          originalTitle: comic.originalTitle,
          publisher: comic.publisher,
          creators: comic.creators,
          genres: comic.genres,
          volumeCount: comic.volumeCount,
          issueCount: comic.issueCount,
          chapterCount: comic.chapterCount,
          description: comic.description,
          issues: comic.issues,
        },
      });
      setPendingRatingComic(null);
      setRatingModalOpen(false);
    } else if (editingLibraryItem) {
      await updateListItem(editingLibraryItem.id, {
        status: 'completed',
        userRating: rating,
        notes: review !== undefined ? review : (editingLibraryItem.notes || undefined),
        title: editingLibraryItem.title,
        coverUrl: editingLibraryItem.coverUrl || undefined,
      });
      setEditingLibraryItem(null);
      setRatingModalOpen(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 md:px-6 py-4 space-y-6">
      {/* Cabeçalho da Página */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-[var(--color-caramelo-claro)] border border-amber-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-3xl md:text-5xl font-cinzel font-bold text-[var(--color-caramelo-claro)] tracking-wide">
              O Grande Acervo
            </h1>
          </div>
          <p className="text-sm md:text-base text-[var(--color-seda-milharal)]/75 font-outfit mt-1">
            Inteligência transmídia universal e métricas consolidadas do seu consumo cultural.
          </p>
        </div>

        {/* Seletor de Abas Acessível com Foco D-Pad para TV */}
        <div
          role="tablist"
          aria-label="Navegação do Grande Acervo"
          className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md self-start md:self-auto"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            tabIndex={0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-outfit font-semibold transition-all duration-200 tv-focus-glow min-h-[44px] cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[var(--color-caramelo-claro)] text-black shadow-md'
                : 'text-[var(--color-seda-milharal)]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'connections'}
            onClick={() => setActiveTab('connections')}
            tabIndex={0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-outfit font-semibold transition-all duration-200 tv-focus-glow min-h-[44px] cursor-pointer ${
              activeTab === 'connections'
                ? 'bg-[var(--color-caramelo-claro)] text-black shadow-md'
                : 'text-[var(--color-seda-milharal)]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Conexões</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'universes'}
            onClick={() => setActiveTab('universes')}
            tabIndex={0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-outfit font-semibold transition-all duration-200 tv-focus-glow min-h-[44px] cursor-pointer ${
              activeTab === 'universes'
                ? 'bg-[var(--color-caramelo-claro)] text-black shadow-md'
                : 'text-[var(--color-seda-milharal)]/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Universos</span>
          </button>
        </div>
      </header>

      {/* Conteúdo da Aba Ativa */}
      <main>
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            <GrandArchiveDashboard />
            <TransmediaRail
              title="Pontes Transmídia Sugeridas"
              subtitle="Obras que se conectam aos títulos que você já avaliou"
              onSelectRecommendation={handleSelectRecommendation}
              onQuickAdd={handleQuickAdd}
            />
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="space-y-8">
            <TransmediaRail
              title="Descobertas Cruzadas Ativas"
              subtitle="Identificamos universos compartilhados a partir dos seus itens com maiores notas"
              onSelectRecommendation={handleSelectRecommendation}
              onQuickAdd={handleQuickAdd}
            />

            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-xl font-cinzel font-bold text-[var(--color-caramelo-claro)] flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                Como Funciona o Motor Transmídia do Akasha?
              </h3>
              <p className="text-sm text-[var(--color-seda-milharal)]/80 font-outfit leading-relaxed">
                Ao contrário de catálogos tradicionais que isolam cada mídia em seu silo, o Akasha identifica a Propriedade Intelectual (IP) e mapeia ramificações entre <strong>Cinema</strong>, <strong>Séries</strong>, <strong>Games</strong>, <strong>Livros</strong> e <strong>Quadrinhos</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs font-mono text-[var(--color-caramelo-claro)] font-bold">1. Detecção de IP</span>
                  <p className="text-xs text-[var(--color-seda-milharal)]/70 mt-1 font-outfit">
                    Reconhecemos franquias a partir dos seus itens com 4★ e 5★ ou concluídos no acervo.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs font-mono text-[var(--color-caramelo-claro)] font-bold">2. Busca de Silos Faltantes</span>
                  <p className="text-xs text-[var(--color-seda-milharal)]/70 mt-1 font-outfit">
                    Cruzamos os domínios que você ainda não experimentou naquela franquia.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-xs font-mono text-[var(--color-caramelo-claro)] font-bold">3. Justificativa Rica</span>
                  <p className="text-xs text-[var(--color-seda-milharal)]/70 mt-1 font-outfit">
                    Apresentamos o porquê da recomendação conectando a obra de origem com o novo formato.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'universes' && (
          <div className="space-y-6">
            <div className="px-1">
              <h3 className="text-xl font-cinzel font-bold text-[var(--color-caramelo-claro)]">
                Catálogo de Universos Transmídia Canônicos
              </h3>
              <p className="text-xs md:text-sm text-[var(--color-seda-milharal)]/70 font-outfit mt-0.5">
                Grandes franquias e sagas mapeadas com suas ramificações em todas as mídias.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {franchises.map((f: CanonicalFranchiseSummary) => (
                <div
                  key={f.id}
                  tabIndex={0}
                  className="glass-panel p-5 rounded-2xl border border-white/10 tv-focus-glow hover:border-[var(--color-caramelo-claro)] transition-all focus:outline-none flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-cinzel font-bold text-[var(--color-seda-milharal)]">
                        {f.name}
                      </h4>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-[var(--color-caramelo-claro)]">
                        {f.mediaCount} mídias registradas
                      </span>
                    </div>

                    <div className="space-y-2 mt-3">
                      {f.medias.map((m) => (
                        <div
                          key={`${m.domain}:${m.externalId}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 text-xs font-outfit"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="uppercase text-[10px] font-mono font-bold text-[var(--color-caramelo-claro)] shrink-0">
                              [{m.domain}]
                            </span>
                            <span className="truncate text-white/90 font-medium">{m.title}</span>
                          </div>
                          {m.releaseYear && (
                            <span className="text-[11px] text-[var(--color-seda-milharal)]/50 shrink-0 font-mono">
                              {m.releaseYear}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modais Especialistas para Inspeção e Adição ao Acervo */}
      {selectedMedia && (
        <MediaDetailsModal
          isOpen={true}
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          isInLibrary={Boolean(selectedMediaLibraryItem)}
          libraryItem={selectedMediaLibraryItem}
          onRemove={(item) => {
            removeFromList(item.id);
            setSelectedMedia(null);
          }}
          onStatusChange={(item, newStatus) => {
            if (newStatus === 'completed') {
              setEditingLibraryItem(item);
              setPendingRatingMedia(null);
              setPendingRatingGame(null);
              setPendingRatingBook(null);
              setPendingRatingComic(null);
              setSelectedMedia(null);
              setRatingModalOpen(true);
              return;
            }

            updateListItem(item.id, {
              status: newStatus,
              title: item.title,
              posterPath: item.coverUrl || undefined,
            });
          }}
          onEdit={(item) => {
            setEditingLibraryItem(item);
            setPendingRatingMedia(null);
            setPendingRatingGame(null);
            setPendingRatingBook(null);
            setPendingRatingComic(null);
            setSelectedMedia(null);
            setRatingModalOpen(true);
          }}
          onAdd={async (media, status = 'plan_to_watch') => {
            if (status === 'completed') {
              setPendingRatingMedia(media);
              setPendingRatingGame(null);
              setPendingRatingBook(null);
              setPendingRatingComic(null);
              setEditingLibraryItem(null);
              setSelectedMedia(null);
              setRatingModalOpen(true);
              return;
            }

            await addToList({
              tmdbId: media.id,
              mediaType: media.mediaType,
              title: media.title,
              posterPath: media.posterUrl || undefined,
              status,
            });
          }}
        />
      )}

      {selectedGame && (
        <GameDetailsModal
          isOpen={true}
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          isInLibrary={Boolean(selectedGameLibraryItem)}
          libraryItem={selectedGameLibraryItem}
          onRemove={(item) => {
            removeFromList(item.id);
            setSelectedGame(null);
          }}
          onStatusChange={(item, newStatus) => {
            if (newStatus === 'completed') {
              setEditingLibraryItem(item);
              setPendingRatingMedia(null);
              setPendingRatingGame(null);
              setPendingRatingBook(null);
              setPendingRatingComic(null);
              setSelectedGame(null);
              setRatingModalOpen(true);
              return;
            }

            updateListItem(item.id, {
              status: newStatus,
              title: item.title,
              coverUrl: item.coverUrl || undefined,
            });
          }}
          onEdit={(item) => {
            setEditingLibraryItem(item);
            setPendingRatingMedia(null);
            setPendingRatingGame(null);
            setPendingRatingBook(null);
            setPendingRatingComic(null);
            setSelectedGame(null);
            setRatingModalOpen(true);
          }}
          onAdd={async (game, status) => {
            if (status === 'completed') {
              setPendingRatingGame(game);
              setPendingRatingMedia(null);
              setPendingRatingBook(null);
              setPendingRatingComic(null);
              setEditingLibraryItem(null);
              setSelectedGame(null);
              setRatingModalOpen(true);
              return;
            }

            await addToList({
              domain: 'game',
              externalId: String(game.id),
              title: game.title,
              coverUrl: game.coverUrl || undefined,
              releaseYear: game.releaseYear || undefined,
              status,
              extraMeta: {
                summary: game.summary,
                platforms: game.platforms,
                genres: game.genres,
                rating: game.rating,
                backdropUrl: game.backdropUrl,
                developer: game.developer,
              },
            });
          }}
        />
      )}

      {selectedBook && (
        <BookDetailsModal
          isOpen={true}
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          isInLibrary={Boolean(selectedBookLibraryItem)}
          libraryItem={selectedBookLibraryItem}
          onRemove={(item) => {
            removeFromList(item.id);
            setSelectedBook(null);
          }}
          onStatusChange={(item, newStatus) => {
            if (newStatus === 'completed') {
              setEditingLibraryItem(item);
              setPendingRatingMedia(null);
              setPendingRatingGame(null);
              setPendingRatingBook(null);
              setPendingRatingComic(null);
              setSelectedBook(null);
              setRatingModalOpen(true);
              return;
            }

            updateListItem(item.id, {
              status: newStatus,
              title: item.title,
              coverUrl: item.coverUrl || undefined,
            });
          }}
          onEdit={(item) => {
            setEditingLibraryItem(item);
            setPendingRatingMedia(null);
            setPendingRatingGame(null);
            setPendingRatingBook(null);
            setPendingRatingComic(null);
            setSelectedBook(null);
            setRatingModalOpen(true);
          }}
          onAdd={async (book, status) => {
            if (status === 'completed') {
              setPendingRatingBook(book);
              setPendingRatingMedia(null);
              setPendingRatingGame(null);
              setPendingRatingComic(null);
              setEditingLibraryItem(null);
              setSelectedBook(null);
              setRatingModalOpen(true);
              return;
            }

            await addToList({
              domain: 'book',
              externalId: String(book.id),
              title: book.title,
              coverUrl: book.coverUrl || undefined,
              releaseYear: book.releaseYear || undefined,
              status,
              extraMeta: {
                subtitle: book.subtitle,
                authors: book.authors,
                publisher: book.publisher,
                publishedDate: book.publishedDate,
                pageCount: book.pageCount,
                categories: book.categories,
                isbn10: book.isbn10,
                isbn13: book.isbn13,
                description: book.description,
              },
            });
          }}
        />
      )}

      {selectedComic && (
        <ComicDetailsModal
          isOpen={true}
          comic={selectedComic}
          onClose={() => setSelectedComic(null)}
          isInLibrary={Boolean(selectedComicLibraryItem)}
          libraryItem={selectedComicLibraryItem}
          onRemove={(item) => {
            removeFromList(item.id);
            setSelectedComic(null);
          }}
          onStatusChange={(item, newStatus) => {
            if (newStatus === 'completed') {
              setEditingLibraryItem(item);
              setPendingRatingMedia(null);
              setPendingRatingGame(null);
              setPendingRatingBook(null);
              setPendingRatingComic(null);
              setSelectedComic(null);
              setRatingModalOpen(true);
              return;
            }

            updateListItem(item.id, {
              status: newStatus,
              title: item.title,
              coverUrl: item.coverUrl || undefined,
            });
          }}
          onEdit={(item) => {
            setEditingLibraryItem(item);
            setPendingRatingMedia(null);
            setPendingRatingGame(null);
            setPendingRatingBook(null);
            setPendingRatingComic(null);
            setSelectedComic(null);
            setRatingModalOpen(true);
          }}
          onAdd={async (comic, status) => {
            if (status === 'completed') {
              setPendingRatingComic(comic);
              setPendingRatingMedia(null);
              setPendingRatingGame(null);
              setPendingRatingBook(null);
              setEditingLibraryItem(null);
              setSelectedComic(null);
              setRatingModalOpen(true);
              return;
            }

            await addToList({
              domain: 'comic',
              externalId: String(comic.id),
              title: comic.title,
              coverUrl: comic.coverUrl || undefined,
              releaseYear: comic.releaseYear || undefined,
              status,
              extraMeta: {
                type: comic.type,
                originalTitle: comic.originalTitle,
                publisher: comic.publisher,
                creators: comic.creators,
                genres: comic.genres,
                volumeCount: comic.volumeCount,
                issueCount: comic.issueCount,
                chapterCount: comic.chapterCount,
                description: comic.description,
                issues: comic.issues,
              },
            });
          }}
        />
      )}

      {/* Modal Unificado de Avaliação e Resenha */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => {
          setRatingModalOpen(false);
          setPendingRatingMedia(null);
          setPendingRatingGame(null);
          setPendingRatingBook(null);
          setPendingRatingComic(null);
          setEditingLibraryItem(null);
        }}
        onSubmit={handleRatingSubmit}
        initialRating={editingLibraryItem?.userRating || undefined}
        initialReview={editingLibraryItem?.notes || undefined}
        title={
          pendingRatingMedia
            ? `Avaliar: ${pendingRatingMedia.title}`
            : pendingRatingGame
            ? `Avaliar: ${pendingRatingGame.title}`
            : pendingRatingBook
            ? `Avaliar: ${pendingRatingBook.title}`
            : pendingRatingComic
            ? `Avaliar: ${pendingRatingComic.title}`
            : editingLibraryItem
            ? `Editar Avaliação: ${editingLibraryItem.title}`
            : 'Avaliar Obra'
        }
      />
    </div>
  );
};
