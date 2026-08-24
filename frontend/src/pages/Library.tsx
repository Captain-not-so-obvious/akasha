import React, { useEffect, useState, useMemo } from 'react';
import { useWishlist } from '../hooks/useWishlist';
import type { LibraryItem, WishlistStatus } from '../types/wishlist';
import type { MediaDetails } from '../types/media';
import { LibraryItemCard } from '../components/ui/LibraryItemCard';
import { RatingModal } from '../components/ui/RatingModal';
import { MediaDetailsModal } from '../components/ui/MediaDetailsModal';
import { RecommendationRail } from '../components/recommendations/RecommendationRail';

type TabKey = 'plan_to_watch' | 'watching' | 'completed';

export const Library: React.FC = () => {
  const { items, isLoading, error, fetchWishlist, updateListItem, removeFromList, addToList } = useWishlist();
  const [activeTab, setActiveTab] = useState<TabKey>('watching');
  
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaDetails | null>(null);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const filteredItems = useMemo(() => {
    // "dropped" items will not be shown in these 3 tabs, but can be added later if needed.
    return items.filter(item => item.status === activeTab);
  }, [items, activeTab]);

  const isSelectedMediaInLibrary = useMemo(() => {
    if (!selectedMedia) return false;
    return items.some(item => item.tmdbId === selectedMedia.id && item.mediaType === selectedMedia.mediaType);
  }, [items, selectedMedia]);

  const handleEditItem = (item: LibraryItem) => {
    setEditingItem(item);
    setRatingModalOpen(true);
  };

  const handleStatusChange = (item: LibraryItem, newStatus: WishlistStatus) => {
    if (newStatus === 'completed') {
      // Quando move para concluído, vamos abrir o modal de rating junto
      setEditingItem(item);
      setRatingModalOpen(true);
      // O submit do modal atualizará status e rating
    } else {
      updateListItem(item.id, { status: newStatus });
    }
  };

  const handleRatingSubmit = (rating: number) => {
    if (editingItem) {
      updateListItem(editingItem.id, { 
        userRating: rating,
        status: editingItem.status !== 'completed' ? 'completed' : undefined // Se não era concluído, agora é
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full min-h-[500px]">
      {/* Seção de Recomendações Inteligentes ML */}
      <RecommendationRail onSelectMedia={setSelectedMedia} />

      {/* Header & Tabs */}
      <div>
        <h2 className="font-cinzel text-3xl font-bold text-[var(--color-caramelo-claro)] mb-4">
          Sua Biblioteca
        </h2>
        
        <div className="flex gap-4 border-b border-white/10 pb-2">
          {(['watching', 'plan_to_watch', 'completed'] as TabKey[]).map(tab => (
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
              {tab === 'watching' && 'Assistindo'}
              {tab === 'plan_to_watch' && 'Quero Ver'}
              {tab === 'completed' && 'Concluídos'}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[var(--color-seda-milharal)] opacity-50">
            <span className="font-outfit animate-pulse">Carregando biblioteca...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <span className="text-4xl">⚠️</span>
            <p className="font-outfit text-red-400">{error}</p>
            <button 
              onClick={fetchWishlist}
              className="tv-focus-glow mt-4 px-4 py-2 bg-white/10 rounded-lg font-outfit text-sm hover:bg-white/20"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <span className="text-5xl opacity-40">📚</span>
            <h3 className="font-cinzel text-xl text-[var(--color-caramelo-claro)]">
              Nenhum título encontrado
            </h3>
            <p className="font-outfit text-[var(--color-seda-milharal)] opacity-50 max-w-sm">
              Sua lista de {activeTab === 'watching' ? 'Assistindo' : activeTab === 'plan_to_watch' ? 'Quero Ver' : 'Concluídos'} está vazia. Use a Busca para adicionar algo novo.
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
            {filteredItems.map(item => (
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

      {/* Modais */}
      <RatingModal
        isOpen={ratingModalOpen}
        onClose={() => {
          setRatingModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleRatingSubmit}
        initialRating={editingItem?.userRating}
        title={`Avaliar ${editingItem?.media.title || 'Mídia'}`}
      />

      <MediaDetailsModal
        isOpen={selectedMedia !== null}
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
        isInLibrary={isSelectedMediaInLibrary}
        onAdd={(media) => {
          addToList({
            tmdbId: media.id,
            mediaType: media.mediaType,
            status: 'plan_to_watch',
          });
        }}
      />
    </div>
  );
};
