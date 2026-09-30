import React, { useState, useEffect, useMemo } from 'react';
import { SearchBar } from '../components/search/SearchBar';
import { MovieCard } from '../components/search/MovieCard';
import { GameCard } from '../components/search/GameCard';
import { BookCard } from '../components/search/BookCard';
import { useSearch } from '../hooks/useSearch';
import { useGameSearch } from '../hooks/useGameSearch';
import { useBookSearch } from '../hooks/useBookSearch';
import { useWishlist } from '../hooks/useWishlist';
import { MediaDetailsModal } from '../components/ui/MediaDetailsModal';
import { GameDetailsModal } from '../components/ui/GameDetailsModal';
import { BookDetailsModal } from '../components/ui/BookDetailsModal';
import { RatingModal } from '../components/ui/RatingModal';
import type { MediaType, MediaDetails, SearchCategory } from '../types/media';
import type { GameDetails } from '../types/game';
import type { BookDetails } from '../types/book';
import type { LibraryItem, WishlistStatus } from '../types/wishlist';

/**
 * Página de Busca Universal — reúne busca de Filmes, Séries, Jogos e Livros.
 *
 * Compatibilidade de plataforma:
 * - TV/D-Pad: Grid responsivo com foco acessível (tabIndex={0}) em cada card.
 *   Navegação por setas impecável e acionamento via Enter/OK.
 * - Mobile: Áreas de toque generosas para cada card e modal adaptado.
 * - Desktop/Telas amplas: Grid de até 7 colunas em telas 2K/4K.
 */
export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('movie');
  const [selectedMedia, setSelectedMedia] = useState<MediaDetails | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameDetails | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookDetails | null>(null);

  // Hook de busca tradicional de Cinema / TV
  const currentMediaType: MediaType = searchCategory === 'tv' ? 'tv' : 'movie';
  const { results: mediaResults, totalResults, isLoading: isMediaLoading, error: mediaError } = useSearch(
    searchCategory === 'game' || searchCategory === 'book' ? '' : query,
    currentMediaType
  );

  // Hook de busca de Jogos via IGDB
  const {
    results: gameResults,
    popularGames,
    isLoading: isGameLoading,
    error: gameError,
  } = useGameSearch(searchCategory === 'game' ? query : '');

  // Hook de busca de Livros via Google Books
  const {
    results: bookResults,
    popularBooks,
    isLoading: isBookLoading,
    error: bookError,
  } = useBookSearch(searchCategory === 'book' ? query : '');

  const { items, fetchWishlist, addToList, removeFromList, updateListItem } = useWishlist();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Chaves de biblioteca para filmes/séries, jogos e livros
  const libraryMediaKeys = useMemo(() => {
    return new Set(
      items
        .filter((item) => item.domain !== 'game' && item.domain !== 'book')
        .map((item) => `${item.mediaType}-${item.tmdbId}`)
    );
  }, [items]);

  const libraryGameMap = useMemo(() => {
    const map = new Map<string, (typeof items)[0]>();
    items.forEach((item) => {
      if (item.domain === 'game' && item.externalId) {
        map.set(String(item.externalId), item);
      }
    });
    return map;
  }, [items]);

  const libraryBookMap = useMemo(() => {
    const map = new Map<string, (typeof items)[0]>();
    items.forEach((item) => {
      if (item.domain === 'book' && item.externalId) {
        map.set(String(item.externalId), item);
      }
    });
    return map;
  }, [items]);

  const selectedIsInLibrary = useMemo(() => {
    if (!selectedMedia) return false;
    return libraryMediaKeys.has(`${selectedMedia.mediaType}-${selectedMedia.id}`);
  }, [selectedMedia, libraryMediaKeys]);

  const selectedMediaLibraryItem = useMemo(() => {
    if (!selectedMedia) return undefined;
    return items.find(
      (item) =>
        (item.domain === 'movie' || !item.domain) &&
        item.tmdbId === selectedMedia.id &&
        item.mediaType === selectedMedia.mediaType
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

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [pendingRatingMedia, setPendingRatingMedia] = useState<MediaDetails | null>(null);
  const [pendingRatingGame, setPendingRatingGame] = useState<GameDetails | null>(null);
  const [pendingRatingBook, setPendingRatingBook] = useState<BookDetails | null>(null);
  const [editingLibraryItem, setEditingLibraryItem] = useState<LibraryItem | null>(null);

  const handleAddGame = async (game: GameDetails, status: WishlistStatus) => {
    if (status === 'completed') {
      setPendingRatingGame(game);
      setPendingRatingBook(null);
      setEditingLibraryItem(null);
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
      setPendingRatingGame(null);
      setEditingLibraryItem(null);
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
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <h2 className="font-cinzel text-3xl font-bold text-[var(--color-caramelo-claro)] mb-1">
          Busca
        </h2>
        <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-60">
          Encontre filmes, séries e jogos para catalogar e enriquecer sua biblioteca.
        </p>
      </div>

      {/* SearchBar */}
      <SearchBar
        query={query}
        searchType={searchCategory}
        mediaType={currentMediaType}
        onQueryChange={setQuery}
        onSearchTypeChange={(type) => {
          setSearchCategory(type);
          setSelectedMedia(null);
          setSelectedGame(null);
          setSelectedBook(null);
        }}
        onMediaTypeChange={(type) => setSearchCategory(type)}
      />

      {/* Renderização condicional Cinema/Séries vs Games vs Livros */}
      {searchCategory === 'game' ? (
        <GameSearchResults
          query={query}
          isLoading={isGameLoading}
          error={gameError}
          results={gameResults}
          popularGames={popularGames}
          libraryGameMap={libraryGameMap}
          onSelectGame={setSelectedGame}
        />
      ) : searchCategory === 'book' ? (
        <BookSearchResults
          query={query}
          isLoading={isBookLoading}
          error={bookError}
          results={bookResults}
          popularBooks={popularBooks}
          libraryBookMap={libraryBookMap}
          onSelectBook={setSelectedBook}
        />
      ) : (
        <SearchResults
          query={query}
          isLoading={isMediaLoading}
          error={mediaError}
          results={mediaResults}
          totalResults={totalResults}
          libraryKeys={libraryMediaKeys}
          onSelectMedia={setSelectedMedia}
        />
      )}

      {/* Modal de detalhes de Cinema / TV */}
      <MediaDetailsModal
        isOpen={selectedMedia !== null}
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        isInLibrary={selectedIsInLibrary}
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
          setSelectedMedia(null);
          setRatingModalOpen(true);
        }}
        onAdd={(media, status = 'plan_to_watch') => {
          if (status === 'completed') {
            setPendingRatingMedia(media);
            setPendingRatingGame(null);
            setPendingRatingBook(null);
            setEditingLibraryItem(null);
            setSelectedMedia(null);
            setRatingModalOpen(true);
            return;
          }

          addToList({
            tmdbId: media.id,
            mediaType: media.mediaType,
            status,
            title: media.title,
            posterPath: media.posterUrl || undefined,
          });
        }}
      />

      {/* Modal de detalhes de Jogos */}
      <GameDetailsModal
        isOpen={selectedGame !== null}
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
        isInLibrary={Boolean(selectedGameLibraryItem)}
        libraryItem={selectedGameLibraryItem}
        onAdd={handleAddGame}
        onRemove={(item) => {
          removeFromList(item.id);
          setSelectedGame(null);
        }}
        onEdit={(item) => {
          setEditingLibraryItem(item);
          setPendingRatingGame(null);
          setPendingRatingBook(null);
          setSelectedGame(null);
          setRatingModalOpen(true);
        }}
        onStatusChange={(item, newStatus) => {
          if (newStatus === 'completed') {
            setEditingLibraryItem(item);
            setPendingRatingGame(null);
            setPendingRatingBook(null);
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
      />

      {/* Modal de detalhes de Livros */}
      <BookDetailsModal
        isOpen={selectedBook !== null}
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        isInLibrary={Boolean(selectedBookLibraryItem)}
        libraryItem={selectedBookLibraryItem}
        onAdd={handleAddBook}
        onRemove={(item) => {
          removeFromList(item.id);
          setSelectedBook(null);
        }}
        onEdit={(item) => {
          setEditingLibraryItem(item);
          setPendingRatingBook(null);
          setPendingRatingGame(null);
          setSelectedBook(null);
          setRatingModalOpen(true);
        }}
        onStatusChange={(item, newStatus) => {
          if (newStatus === 'completed') {
            setEditingLibraryItem(item);
            setPendingRatingBook(null);
            setPendingRatingGame(null);
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
      />

      {/* Modal de Avaliação para jogos zerados ou livros lidos */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => {
          setRatingModalOpen(false);
          setPendingRatingGame(null);
          setPendingRatingBook(null);
          setEditingLibraryItem(null);
        }}
        onSubmit={handleRatingSubmit}
        title={pendingRatingBook?.title || pendingRatingGame?.title || editingLibraryItem?.title || 'Avaliar Obra'}
        initialRating={editingLibraryItem?.userRating || 0}
        initialReview={editingLibraryItem?.notes || ''}
      />
    </div>
  );
};

// --- Sub-componentes internos para Cinema e Séries ---

interface SearchResultsProps {
  query: string;
  isLoading: boolean;
  error: string | null;
  results: MediaDetails[];
  totalResults: number;
  libraryKeys: Set<string>;
  onSelectMedia: (media: MediaDetails) => void;
}

function SearchResults({ query, isLoading, error, results, totalResults, libraryKeys, onSelectMedia }: SearchResultsProps) {
  if (query.trim().length < 2 && !isLoading) {
    return (
      <EmptyState
        icon="🔍"
        title="O que você quer assistir?"
        description="Digite pelo menos 2 caracteres para iniciar a busca."
      />
    );
  }

  if (isLoading) {
    return <LoadingGrid />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Algo deu errado"
        description={error}
        isError
      />
    );
  }

  if (results.length === 0 && query.trim().length >= 2) {
    return (
      <EmptyState
        icon="😶‍🌫️"
        title="Nenhum resultado encontrado"
        description={`Não encontramos nada para "${query}". Tente outro título.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-50">
        {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
      </p>
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
        role="list"
        aria-label="Resultados da busca"
      >
        {results.map((media) => {
          const isInLibrary = libraryKeys.has(`${media.mediaType}-${media.id}`);
          return (
            <div key={`${media.mediaType}-${media.id}`} role="listitem">
              <MovieCard media={media} onSelect={onSelectMedia} isInLibrary={isInLibrary} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Sub-componente interno para Jogos ---

interface GameSearchResultsProps {
  query: string;
  isLoading: boolean;
  error: string | null;
  results: GameDetails[];
  popularGames: GameDetails[];
  libraryGameMap: Map<string, any>;
  onSelectGame: (game: GameDetails) => void;
}

function GameSearchResults({
  query,
  isLoading,
  error,
  results,
  popularGames,
  libraryGameMap,
  onSelectGame,
}: GameSearchResultsProps) {
  // Estado de cold-start (sem query): exibe jogos populares se disponíveis
  if (query.trim().length < 2 && !isLoading) {
    if (popularGames.length > 0) {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-white/5">
            <div>
              <h3 className="font-cinzel text-lg font-bold text-[var(--color-caramelo-claro)]">
                🔥 Jogos em Alta
              </h3>
              <p className="font-outfit text-xs text-[var(--color-seda-milharal)]/70">
                Títulos mais assistidos e em alta na Twitch para inspirar sua biblioteca
              </p>
            </div>
          </div>

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
            role="list"
            aria-label="Jogos em alta"
          >
            {popularGames.map((game) => {
              const isInLibrary = libraryGameMap.has(String(game.id));
              return (
                <div key={game.id} role="listitem">
                  <GameCard game={game} onSelect={onSelectGame} isInLibrary={isInLibrary} />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <EmptyState
        icon="🎮"
        title="O que você quer jogar?"
        description="Digite o nome de uma franquia ou título (ex: Elden Ring, Zelda, Cyberpunk)..."
      />
    );
  }

  if (isLoading) {
    return <LoadingGrid />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Algo deu errado na busca de jogos"
        description={error}
        isError
      />
    );
  }

  if (results.length === 0 && query.trim().length >= 2) {
    return (
      <EmptyState
        icon="🕹️"
        title="Nenhum jogo encontrado"
        description={`Não encontramos nenhum jogo com "${query}". Tente buscar em inglês ou simplificar o nome.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-50">
        {results.length} jogo{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
      </p>
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
        role="list"
        aria-label="Resultados de busca de jogos"
      >
        {results.map((game) => {
          const isInLibrary = libraryGameMap.has(String(game.id));
          return (
            <div key={game.id} role="listitem">
              <GameCard game={game} onSelect={onSelectGame} isInLibrary={isInLibrary} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Sub-componente interno para Livros ---

interface BookSearchResultsProps {
  query: string;
  isLoading: boolean;
  error: string | null;
  results: BookDetails[];
  popularBooks: BookDetails[];
  libraryBookMap: Map<string, any>;
  onSelectBook: (book: BookDetails) => void;
}

function BookSearchResults({
  query,
  isLoading,
  error,
  results,
  popularBooks,
  libraryBookMap,
  onSelectBook,
}: BookSearchResultsProps) {
  // Estado de cold-start (sem query): exibe livros populares/clássicos
  if (query.trim().length < 2 && !isLoading) {
    if (popularBooks.length > 0) {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-white/5">
            <div>
              <h3 className="font-cinzel text-lg font-bold text-[var(--color-caramelo-claro)]">
                🔥 Leituras em Destaque
              </h3>
              <p className="font-outfit text-xs text-[var(--color-seda-milharal)]/70">
                Grandes obras e clássicos da literatura para inspirar sua estante
              </p>
            </div>
          </div>

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
            role="list"
            aria-label="Livros em destaque"
          >
            {popularBooks.map((book) => {
              const isInLibrary = libraryBookMap.has(String(book.id));
              return (
                <div key={book.id} role="listitem">
                  <BookCard book={book} onSelect={onSelectBook} isInLibrary={isInLibrary} />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <EmptyState
        icon="📚"
        title="O que você quer ler?"
        description="Digite o título de um livro, nome do autor ou código ISBN..."
      />
    );
  }

  if (isLoading) {
    return <LoadingGrid />;
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Algo deu errado na busca de livros"
        description={error}
        isError
      />
    );
  }

  if (results.length === 0 && query.trim().length >= 2) {
    return (
      <EmptyState
        icon="📖"
        title="Nenhum livro encontrado"
        description={`Não encontramos nenhum livro com "${query}". Tente buscar pelo autor ou pelo ISBN.`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-outfit text-xs text-[var(--color-seda-milharal)] opacity-50">
        {results.length} livro{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
      </p>
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
        role="list"
        aria-label="Resultados de busca de livros"
      >
        {results.map((book) => {
          const isInLibrary = libraryBookMap.has(String(book.id));
          return (
            <div key={book.id} role="listitem">
              <BookCard book={book} onSelect={onSelectBook} isInLibrary={isInLibrary} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Componentes visuais utilitários ---

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  isError?: boolean;
}

function EmptyState({ icon, title, description, isError = false }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="text-5xl" role="img" aria-hidden="true">{icon}</span>
      <h3 className={`font-cinzel text-xl font-bold ${isError ? 'text-red-400' : 'text-[var(--color-caramelo-claro)]'}`}>
        {title}
      </h3>
      <p className="font-outfit text-sm text-[var(--color-seda-milharal)] opacity-60 max-w-xs">
        {description}
      </p>
    </div>
  );
}

function LoadingGrid() {
  return (
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
      aria-busy="true"
      aria-label="Carregando resultados"
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden bg-white/5 border border-white/10 animate-pulse"
          aria-hidden="true"
        >
          <div className="aspect-[2/3] bg-white/10" />
          <div className="p-3 flex flex-col gap-2">
            <div className="h-3 bg-white/10 rounded w-3/4" />
            <div className="h-2 bg-white/10 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
