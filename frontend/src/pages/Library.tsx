import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { apiFetch } from '../lib/api';
import type { LibraryItem, WishlistStatus } from '../types/wishlist';
import type { MediaDetails } from '../types/media';
import type { BookDetails } from '../types/book';
import type { GameDetails } from '../types/game';
import { LibraryItemCard } from '../components/ui/LibraryItemCard';
import { RatingModal } from '../components/ui/RatingModal';
import { MediaDetailsModal } from '../components/ui/MediaDetailsModal';
import { GameDetailsModal } from '../components/ui/GameDetailsModal';
import { BookDetailsModal } from '../components/ui/BookDetailsModal';
import { RecommendationRail } from '../components/recommendations/RecommendationRail';
import { GameRecommendationRail } from '../components/recommendations/GameRecommendationRail';
import { BookRecommendationRail } from '../components/recommendations/BookRecommendationRail';
import { ThematicLoader } from '../components/ui/ThematicLoader';

type TabKey = 'plan_to_watch' | 'watching' | 'completed';
type DomainKey = 'movie' | 'game' | 'book';

export const Library: React.FC = () => {
  const { items, isLoading, error, fetchWishlist, updateListItem, removeFromList, addToList } = useWishlist();
  const [activeDomain, setActiveDomain] = useState<DomainKey>('movie');
  const [activeTab, setActiveTab] = useState<TabKey>('watching');

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);

  // Modais de detalhes especialistas por domínio
  const [selectedMedia, setSelectedMedia] = useState<MediaDetails | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameDetails | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookDetails | null>(null);

  // Estados pendentes para avaliação de novos itens adicionados como "Concluídos / Já Li / Já Zerei"
  const [pendingRatingMedia, setPendingRatingMedia] = useState<MediaDetails | null>(null);
  const [pendingRatingGame, setPendingRatingGame] = useState<GameDetails | null>(null);
  const [pendingRatingBook, setPendingRatingBook] = useState<BookDetails | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const tmdbIdParam = searchParams.get('tmdbId');
  const typeParam = searchParams.get('type') as 'movie' | 'tv' | null;

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Carrega automaticamente a mídia quando tmdbId for fornecido na URL (ex: clique em notificações)
  useEffect(() => {
    if (tmdbIdParam) {
      const id = Number(tmdbIdParam);
      const mediaType = typeParam === 'tv' ? 'tv' : 'movie';
      if (!isNaN(id) && id > 0) {
        apiFetch(`/tmdb/${mediaType}/${id}`)
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              setSelectedMedia(data);
            }
          })
          .catch(() => {});
      }
    }
  }, [tmdbIdParam, typeParam]);

  const handleCloseMediaModal = () => {
    setSelectedMedia(null);
    if (searchParams.has('tmdbId') || searchParams.has('type')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tmdbId');
      newParams.delete('type');
      setSearchParams(newParams, { replace: true });
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchDomain =
        activeDomain === 'movie'
          ? item.domain !== 'game' && item.domain !== 'book'
          : item.domain === activeDomain;
      return matchDomain && item.status === activeTab;
    });
  }, [items, activeTab, activeDomain]);

  const selectedLibraryItem = useMemo(() => {
    if (!selectedMedia) return undefined;
    return items.find((item) => {
      if (item.domain === 'game' || item.domain === 'book') {
        return item.externalId === String(selectedMedia.id);
      }
      return item.tmdbId === selectedMedia.id && item.mediaType === selectedMedia.mediaType;
    });
  }, [items, selectedMedia]);

  const selectedGameLibraryItem = useMemo(() => {
    if (!selectedGame) return undefined;
    return items.find((item) => item.domain === 'game' && item.externalId === String(selectedGame.id));
  }, [items, selectedGame]);

  const selectedBookLibraryItem = useMemo(() => {
    if (!selectedBook) return undefined;
    return items.find((item) => item.domain === 'book' && item.externalId === String(selectedBook.id));
  }, [items, selectedBook]);

  const handleEditItem = (item: LibraryItem) => {
    setEditingItem(item);
    setPendingRatingMedia(null);
    setPendingRatingGame(null);
    setPendingRatingBook(null);
    setRatingModalOpen(true);
  };

  const handleStatusChange = (item: LibraryItem, newStatus: WishlistStatus) => {
    if (newStatus === 'completed') {
      setEditingItem(item);
      setPendingRatingMedia(null);
      setPendingRatingGame(null);
      setPendingRatingBook(null);
      setRatingModalOpen(true);
    } else {
      updateListItem(item.id, {
        status: newStatus,
        title: item.title || item.media?.title,
        posterPath: item.coverUrl || item.media?.posterUrl || undefined,
      });
    }
  };

  // Ações de adição a partir de modais especialistas
  const handleAddMedia = async (media: MediaDetails, status: WishlistStatus = 'plan_to_watch') => {
    if (status === 'completed') {
      setPendingRatingMedia(media);
      setPendingRatingGame(null);
      setPendingRatingBook(null);
      setEditingItem(null);
      setSelectedMedia(null);
      setRatingModalOpen(true);
      return;
    }

    await addToList({
      tmdbId: media.id,
      mediaType: media.mediaType,
      status,
    });
  };

  const handleAddGame = async (game: GameDetails, status: WishlistStatus) => {
    if (status === 'completed') {
      setPendingRatingGame(game);
      setPendingRatingMedia(null);
      setPendingRatingBook(null);
      setEditingItem(null);
      setSelectedGame(null);
      setRatingModalOpen(true);
      return;
    }

    await addToList({
      domain: 'game',
      externalId: String(game.id),
      status,
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
  };

  const handleAddBook = async (book: BookDetails, status: WishlistStatus) => {
    if (status === 'completed') {
      setPendingRatingBook(book);
      setPendingRatingMedia(null);
      setPendingRatingGame(null);
      setEditingItem(null);
      setSelectedBook(null);
      setRatingModalOpen(true);
      return;
    }

    await addToList({
      domain: 'book',
      externalId: String(book.id),
      status,
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
  };

  // Submissão unificada do modal de avaliação
  const handleRatingSubmit = async (rating: number, review?: string) => {
    if (pendingRatingBook) {
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
    } else if (pendingRatingMedia) {
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
    } else if (editingItem) {
      updateListItem(editingItem.id, {
        userRating: rating,
        notes: review !== undefined ? review : (editingItem.notes || undefined),
        status: editingItem.status !== 'completed' ? 'completed' : undefined,
        title: editingItem.title || editingItem.media?.title,
        posterPath: editingItem.coverUrl || editingItem.media?.posterUrl || undefined,
      });
      setEditingItem(null);
      setRatingModalOpen(false);
    }
  };

  // Abre o modal especialista adequado ao clicar em um item da biblioteca
  const handleSelectLibraryItem = (item: LibraryItem) => {
    if (item.domain === 'book') {
      const meta = item.extraMeta as Record<string, unknown> | undefined;
      setSelectedBook({
        id: item.externalId,
        title: item.title,
        subtitle: typeof meta?.subtitle === 'string' ? meta.subtitle : undefined,
        authors: Array.isArray(meta?.authors) ? (meta.authors as string[]) : [],
        publisher: typeof meta?.publisher === 'string' ? meta.publisher : undefined,
        publishedDate: typeof meta?.publishedDate === 'string' ? meta.publishedDate : undefined,
        releaseYear: item.releaseYear ?? null,
        description: typeof meta?.description === 'string' ? meta.description : item.media?.overview,
        pageCount: typeof meta?.pageCount === 'number' ? meta.pageCount : undefined,
        categories: Array.isArray(meta?.categories) ? (meta.categories as string[]) : [],
        coverUrl: item.coverUrl || item.media?.posterUrl || null,
        isbn10: typeof meta?.isbn10 === 'string' ? meta.isbn10 : undefined,
        isbn13: typeof meta?.isbn13 === 'string' ? meta.isbn13 : undefined,
      });
    } else if (item.domain === 'game') {
      const meta = item.extraMeta as Record<string, unknown> | undefined;
      setSelectedGame({
        id: item.externalId,
        title: item.title,
        summary: typeof meta?.summary === 'string' ? meta.summary : item.media?.overview,
        coverUrl: item.coverUrl || item.media?.posterUrl || null,
        releaseYear: item.releaseYear ?? null,
        platforms: Array.isArray(meta?.platforms) ? (meta.platforms as string[]) : [],
        genres: Array.isArray(meta?.genres) ? (meta.genres as string[]) : [],
        rating: typeof meta?.rating === 'number' ? meta.rating : undefined,
        backdropUrl: typeof meta?.backdropUrl === 'string' ? meta.backdropUrl : null,
        developer: typeof meta?.developer === 'string' ? meta.developer : undefined,
      });
    } else {
      setSelectedMedia(item.media);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full min-h-[500px]">
      {/* Seletor de Domínio: Cinema & TV vs Games vs Livros */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="font-cinzel text-3xl font-bold text-[var(--color-caramelo-claro)]">
            Sua Biblioteca
          </h2>
          <p className="font-outfit text-xs text-[var(--color-seda-milharal)]/70 mt-1">
            Seu acervo universal de entretenimento e experiências catalogadas
          </p>
        </div>

        {/* Toggle Universal de Domínio */}
        <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
          <button
            type="button"
            tabIndex={0}
            onClick={() => setActiveDomain('movie')}
            className={`tv-focus-glow px-4 py-2 rounded-lg font-cinzel text-xs md:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeDomain === 'movie'
                ? 'bg-[var(--color-caramelo-claro)] text-black shadow-md shadow-yellow-900/40 font-bold'
                : 'text-[var(--color-seda-milharal)] opacity-70 hover:opacity-100 hover:bg-white/5'
            }`}
          >
            <span>🎬</span> Cinema & Séries
          </button>
          <button
            type="button"
            tabIndex={0}
            onClick={() => setActiveDomain('game')}
            className={`tv-focus-glow px-4 py-2 rounded-lg font-cinzel text-xs md:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeDomain === 'game'
                ? 'bg-[var(--color-caramelo-claro)] text-black shadow-md shadow-yellow-900/40 font-bold'
                : 'text-[var(--color-seda-milharal)] opacity-70 hover:opacity-100 hover:bg-white/5'
            }`}
          >
            <span>🎮</span> Jogos (Games)
          </button>
          <button
            type="button"
            tabIndex={0}
            onClick={() => setActiveDomain('book')}
            className={`tv-focus-glow px-4 py-2 rounded-lg font-cinzel text-xs md:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeDomain === 'book'
                ? 'bg-[var(--color-caramelo-claro)] text-black shadow-md shadow-yellow-900/40 font-bold'
                : 'text-[var(--color-seda-milharal)] opacity-70 hover:opacity-100 hover:bg-white/5'
            }`}
          >
            <span>📚</span> Livros (Leituras)
          </button>
        </div>
      </div>

      {/* Trilho de Recomendações Inteligentes correspondente ao domínio ativo */}
      {activeDomain === 'movie' ? (
        <RecommendationRail onSelectMedia={setSelectedMedia} />
      ) : activeDomain === 'game' ? (
        <GameRecommendationRail
          onSelectGame={(game) => {
            setSelectedGame({
              id: game.id,
              title: game.title,
              summary: game.summary,
              coverUrl: game.coverUrl,
              releaseYear: game.releaseYear,
              platforms: game.platforms,
              genres: game.genres,
              rating: game.rating,
              backdropUrl: game.backdropUrl,
              developer: game.developer,
              reason: game.reason,
            });
          }}
          onQuickAdd={(game) => {
            addToList({
              domain: 'game',
              externalId: game.id,
              title: game.title,
              coverUrl: game.coverUrl || undefined,
              releaseYear: game.releaseYear || undefined,
              status: 'plan_to_watch',
              extraMeta: {
                summary: game.summary,
                genres: game.genres,
                platforms: game.platforms,
                rating: game.rating,
                developer: game.developer,
              },
            });
          }}
        />
      ) : (
        <BookRecommendationRail
          onSelectBook={(book) => {
            setSelectedBook({
              id: book.id,
              title: book.title,
              authors: book.authors,
              releaseYear: book.releaseYear,
              description: book.description,
              pageCount: book.pageCount,
              categories: book.categories,
              coverUrl: book.coverUrl,
              reason: book.reason,
            });
          }}
          onQuickAdd={(book) => {
            addToList({
              domain: 'book',
              externalId: book.id,
              title: book.title,
              coverUrl: book.coverUrl || undefined,
              releaseYear: book.releaseYear || undefined,
              status: 'plan_to_watch',
              extraMeta: {
                authors: book.authors,
                categories: book.categories,
                pageCount: book.pageCount,
                description: book.description,
              },
            });
          }}
        />
      )}

      {/* Abas contextuais do Domínio */}
      <div className="flex gap-4 border-b border-white/10 pb-2">
        {(['watching', 'plan_to_watch', 'completed'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            tabIndex={0}
            onClick={() => setActiveTab(tab)}
            className={`tv-focus-glow font-outfit text-sm md:text-base px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-[var(--color-caramelo-claro)] text-black font-bold'
                : 'text-[var(--color-seda-milharal)] opacity-60 hover:opacity-100 hover:bg-white/5'
            }`}
          >
            {activeDomain === 'game' ? (
              <>
                {tab === 'watching' && 'Jogando'}
                {tab === 'plan_to_watch' && 'Quero Jogar'}
                {tab === 'completed' && 'Concluídos (Zerados)'}
              </>
            ) : activeDomain === 'book' ? (
              <>
                {tab === 'watching' && 'Lendo'}
                {tab === 'plan_to_watch' && 'Quero Ler'}
                {tab === 'completed' && 'Concluídos (Lidos)'}
              </>
            ) : (
              <>
                {tab === 'watching' && 'Assistindo'}
                {tab === 'plan_to_watch' && 'Quero Ver'}
                {tab === 'completed' && 'Concluídos'}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da Biblioteca */}
      <div className="w-full flex-1">
        {isLoading ? (
          <div className="w-full py-16 flex items-center justify-center">
            <ThematicLoader
              domain={activeDomain}
              size="lg"
              subtext="Sincronizando seu acervo no Akasha"
            />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">
            <p className="font-outfit">{error}</p>
            <button
              onClick={() => fetchWishlist()}
              className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-outfit text-sm transition-colors cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
            <span className="text-4xl opacity-40">
              {activeDomain === 'game' ? '🎮' : activeDomain === 'book' ? '📚' : '🎬'}
            </span>
            <h3 className="font-cinzel text-lg text-[var(--color-seda-milharal)] font-bold">
              {activeDomain === 'game'
                ? 'Nenhum jogo nesta lista'
                : activeDomain === 'book'
                ? 'Nenhum livro nesta estante'
                : 'Nenhum título encontrado'}
            </h3>
            <p className="font-outfit text-[var(--color-seda-milharal)] opacity-50 max-w-sm">
              {activeDomain === 'game' ? (
                <>
                  Sua lista de {activeTab === 'watching' ? 'Jogando' : activeTab === 'plan_to_watch' ? 'Quero Jogar' : 'Zerados'} está vazia. Adicione os jogos sugeridos acima para começar a construir seu perfil gamer!
                </>
              ) : activeDomain === 'book' ? (
                <>
                  Sua lista de {activeTab === 'watching' ? 'Lendo' : activeTab === 'plan_to_watch' ? 'Quero Ler' : 'Lidos'} está vazia. Use a Busca ou explore as sugestões do Akasha acima!
                </>
              ) : (
                <>
                  Sua lista de {activeTab === 'watching' ? 'Assistindo' : activeTab === 'plan_to_watch' ? 'Quero Ver' : 'Concluídos'} está vazia. Use a Busca para adicionar algo novo.
                </>
              )}
            </p>
          </div>
        ) : (
          <div
            className="
              grid gap-4
              grid-cols-2
              sm:grid-cols-3
              md:grid-cols-4
              lg:grid-cols-5
              xl:grid-cols-6
              2xl:grid-cols-7
            "
          >
            {filteredItems.map((item) => (
              <LibraryItemCard
                key={item.id}
                item={item}
                onEdit={handleEditItem}
                onRemove={(i) => removeFromList(i.id)}
                onStatusChange={handleStatusChange}
                onSelect={setSelectedMedia}
                onSelectItem={handleSelectLibraryItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais de Avaliação e Detalhes Especialistas */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => {
          setRatingModalOpen(false);
          setEditingItem(null);
          setPendingRatingMedia(null);
          setPendingRatingGame(null);
          setPendingRatingBook(null);
        }}
        onSubmit={handleRatingSubmit}
        initialRating={editingItem?.userRating}
        initialReview={editingItem?.notes}
        title={`Avaliar ${
          editingItem?.title ||
          editingItem?.media?.title ||
          pendingRatingBook?.title ||
          pendingRatingGame?.title ||
          pendingRatingMedia?.title ||
          'Obra'
        }`}
      />

      {/* Modal de Cinema / Séries (TMDB) */}
      <MediaDetailsModal
        isOpen={selectedMedia !== null}
        media={selectedMedia}
        onClose={handleCloseMediaModal}
        isInLibrary={!!selectedLibraryItem}
        libraryItem={selectedLibraryItem}
        onRemove={(item) => removeFromList(item.id)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditItem}
        onAdd={handleAddMedia}
      />

      {/* Modal Especialista de Jogos (IGDB) */}
      <GameDetailsModal
        isOpen={selectedGame !== null}
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        isInLibrary={!!selectedGameLibraryItem}
        libraryItem={selectedGameLibraryItem}
        onRemove={(item) => removeFromList(item.id)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditItem}
        onAdd={handleAddGame}
      />

      {/* Modal Especialista de Livros (Google Books & Open Library) */}
      <BookDetailsModal
        isOpen={selectedBook !== null}
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        isInLibrary={!!selectedBookLibraryItem}
        libraryItem={selectedBookLibraryItem}
        onRemove={(item) => removeFromList(item.id)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditItem}
        onAdd={handleAddBook}
      />
    </div>
  );
};
