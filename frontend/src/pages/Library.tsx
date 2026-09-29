import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { apiFetch } from '../lib/api';
import type { LibraryItem, WishlistStatus } from '../types/wishlist';
import type { MediaDetails } from '../types/media';
import { LibraryItemCard } from '../components/ui/LibraryItemCard';
import { RatingModal } from '../components/ui/RatingModal';
import { MediaDetailsModal } from '../components/ui/MediaDetailsModal';
import { RecommendationRail } from '../components/recommendations/RecommendationRail';
import { GameRecommendationRail } from '../components/recommendations/GameRecommendationRail';

type TabKey = 'plan_to_watch' | 'watching' | 'completed';
type DomainKey = 'movie' | 'game';

export const Library: React.FC = () => {
  const { items, isLoading, error, fetchWishlist, updateListItem, removeFromList, addToList } = useWishlist();
  const [activeDomain, setActiveDomain] = useState<DomainKey>('movie');
  const [activeTab, setActiveTab] = useState<TabKey>('watching');
  
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaDetails | null>(null);

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
      const isGame = item.domain === 'game';
      const matchDomain = activeDomain === 'game' ? isGame : !isGame;
      return matchDomain && item.status === activeTab;
    });
  }, [items, activeTab, activeDomain]);

  const selectedLibraryItem = useMemo(() => {
    if (!selectedMedia) return undefined;
    return items.find((item) => {
      if (item.domain === 'game') {
        return item.externalId === String(selectedMedia.id);
      }
      return item.tmdbId === selectedMedia.id && item.mediaType === selectedMedia.mediaType;
    });
  }, [items, selectedMedia]);

  const handleEditItem = (item: LibraryItem) => {
    setEditingItem(item);
    setRatingModalOpen(true);
  };

  const handleStatusChange = (item: LibraryItem, newStatus: WishlistStatus) => {
    if (newStatus === 'completed') {
      setEditingItem(item);
      setRatingModalOpen(true);
    } else {
      updateListItem(item.id, { 
        status: newStatus,
        title: item.title || item.media?.title,
        posterPath: item.coverUrl || item.media?.posterUrl || undefined,
      });
    }
  };

  const handleRatingSubmit = (rating: number, review?: string) => {
    if (editingItem) {
      updateListItem(editingItem.id, { 
        userRating: rating,
        notes: review !== undefined ? review : (editingItem.notes || undefined),
        status: editingItem.status !== 'completed' ? 'completed' : undefined,
        title: editingItem.title || editingItem.media?.title,
        posterPath: editingItem.coverUrl || editingItem.media?.posterUrl || undefined,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full min-h-[500px]">
      {/* Seletor de Domínio: Cinema & TV vs Games */}
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
        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10">
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
        </div>
      </div>

      {/* Trilho de Recomendações Inteligentes correspondente ao domínio ativo */}
      {activeDomain === 'movie' ? (
        <RecommendationRail onSelectMedia={setSelectedMedia} />
      ) : (
        <GameRecommendationRail
          onSelectGame={(game) => {
            setSelectedMedia({
              id: Number(game.id) || 0,
              title: game.title,
              overview: game.reason,
              posterUrl: game.coverUrl || '',
              backdropUrl: game.backdropUrl || '',
              mediaType: 'movie',
              releaseDate: game.releaseYear ? `${game.releaseYear}-01-01` : '',
              voteAverage: game.rating ? game.rating / 10 : 0,
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
                genres: game.genres,
                platforms: game.platforms,
                rating: game.rating,
                developer: game.developer,
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
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--color-seda-milharal)] opacity-50">
            <span className="font-outfit animate-pulse">Carregando acervo...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <span className="text-4xl">⚠️</span>
            <p className="font-outfit text-red-400">{error}</p>
            <button 
              type="button"
              tabIndex={0}
              onClick={fetchWishlist}
              className="tv-focus-glow mt-4 px-4 py-2 bg-white/10 rounded-lg font-outfit text-sm hover:bg-white/20"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <span className="text-5xl opacity-40">
              {activeDomain === 'game' ? '🎮' : '🎬'}
            </span>
            <h3 className="font-cinzel text-xl text-[var(--color-caramelo-claro)]">
              {activeDomain === 'game' ? 'Nenhum jogo nesta aba' : 'Nenhum título encontrado'}
            </h3>
            <p className="font-outfit text-[var(--color-seda-milharal)] opacity-50 max-w-sm">
              {activeDomain === 'game' ? (
                <>
                  Sua lista de {activeTab === 'watching' ? 'Jogando' : activeTab === 'plan_to_watch' ? 'Quero Jogar' : 'Zerados'} está vazia. Adicione os jogos sugeridos acima para começar a construir seu perfil gamer!
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais de Avaliação e Detalhes */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => {
          setRatingModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleRatingSubmit}
        initialRating={editingItem?.userRating}
        initialReview={editingItem?.notes}
        title={`Avaliar ${editingItem?.title || editingItem?.media?.title || 'Obra'}`}
      />

      <MediaDetailsModal
        isOpen={selectedMedia !== null}
        media={selectedMedia}
        onClose={handleCloseMediaModal}
        isInLibrary={!!selectedLibraryItem}
        libraryItem={selectedLibraryItem}
        onRemove={(item) => removeFromList(item.id)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditItem}
        onAdd={(media) => {
          if (activeDomain === 'game') {
            addToList({
              domain: 'game',
              externalId: String(media.id),
              title: media.title,
              coverUrl: media.posterUrl || undefined,
              releaseYear: media.releaseDate ? parseInt(media.releaseDate.slice(0, 4), 10) : undefined,
              status: 'plan_to_watch',
            });
          } else {
            addToList({
              tmdbId: media.id,
              mediaType: media.mediaType,
              status: 'plan_to_watch',
            });
          }
        }}
      />
    </div>
  );
};
