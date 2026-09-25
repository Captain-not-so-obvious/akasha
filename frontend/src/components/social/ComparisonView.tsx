import React, { useState, useEffect } from 'react';
import { useFriendComparison } from '../../hooks/useFriendComparison';
import { AffinityBadge } from './AffinityBadge';
import { GlassPanel } from '../ui/GlassPanel';
import {
  ArrowLeft,
  Film,
  Star,
  Plus,
  Check,
  Sparkles,
  Swords,
  Flame,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type {
  WatchTogetherItem,
  RatedOverlapItem,
  FriendRecommendationItem,
} from '../../types/comparison';

interface ComparisonViewProps {
  friendId: string;
  friendName: string;
  onBack: () => void;
}

type TabType = 'watchTogether' | 'ratedOverlap' | 'recommendations';

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  friendId,
  friendName,
  onBack,
}) => {
  const { data, isLoading, error, actionFeedback, refetch, addToBacklog } =
    useFriendComparison(friendId);

  const [activeTab, setActiveTab] = useState<TabType>('watchTogether');

  // Suporte a tecla Esc para voltar na Android TV e Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-amber-300 animate-spin" />
        <p className="text-stone-300 font-['Cinzel'] tracking-wider animate-pulse">
          Consultando os Registros Akáshicos e alinhando acervos...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <GlassPanel className="p-8 text-center max-w-lg mx-auto my-8 border-rose-500/30">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold font-['Cinzel'] text-stone-100 mb-2">
          Falha na Sincronia Cósmica
        </h3>
        <p className="text-sm text-stone-300 mb-6">{error || 'Não foi possível carregar os dados.'}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            tabIndex={0}
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 transition focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Voltar
          </button>
          <button
            type="button"
            tabIndex={0}
            onClick={() => refetch()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Barra Superior de Navegação e Retorno */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          tabIndex={0}
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-stone-300 hover:text-stone-100 transition duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:scale-105"
          aria-label="Voltar para a lista de amigos"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar aos Amigos</span>
        </button>

        <div className="flex items-center gap-3">
          {data.friend.avatarUrl ? (
            <img
              src={data.friend.avatarUrl}
              alt={data.friend.username}
              className="w-8 h-8 rounded-full border border-amber-400/40 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-stone-700 border border-white/20 flex items-center justify-center text-xs font-bold text-amber-300">
              {data.friend.username.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-stone-200">
            Sincronia com <strong className="text-amber-300">{data.friend.username}</strong>
          </span>
          {data.friend.friendCode && (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-black/30 border border-white/10 text-stone-400">
              {data.friend.friendCode}
            </span>
          )}
        </div>
      </div>

      {/* Banner de Feedback de Ação Rápida */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Badge Principal de Afinidade Cósmica */}
      <AffinityBadge affinity={data.affinity} />

      {/* Seletor de Abas de Comparação */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          tabIndex={0}
          onClick={() => setActiveTab('watchTogether')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 ${
            activeTab === 'watchTogether'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-lg'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Film className="w-4 h-4 text-amber-400" />
          <span>Para Ver Juntos</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/40 text-stone-200 font-mono">
            {data.watchTogether.length}
          </span>
        </button>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setActiveTab('ratedOverlap')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 ${
            activeTab === 'ratedOverlap'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-lg'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Swords className="w-4 h-4 text-emerald-400" />
          <span>Consenso & Duelo</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/40 text-stone-200 font-mono">
            {data.ratedOverlap.length}
          </span>
        </button>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 ${
            activeTab === 'recommendations'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-lg'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>Recomendações de {data.friend.username}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/40 text-stone-200 font-mono">
            {data.friendRecommendations.length}
          </span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Para Ver Juntos */}
      {activeTab === 'watchTogether' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold font-['Cinzel'] text-stone-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Sessão a Dois: Obras que ambos querem assistir
            </h4>
            <span className="text-xs text-stone-400">
              {data.watchTogether.length} {data.watchTogether.length === 1 ? 'obra encontrada' : 'obras encontradas'}
            </span>
          </div>

          {data.watchTogether.length === 0 ? (
            <GlassPanel className="p-8 text-center border-dashed border-white/10">
              <Film className="w-12 h-12 text-stone-500 mx-auto mb-3" />
              <p className="text-stone-300 font-medium">Nenhuma obra em comum no backlog no momento.</p>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Quando você e {data.friend.username} marcarem os mesmos filmes ou séries como "Quero Ver",
                eles aparecerão aqui para facilitar a escolha no sofá!
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data.watchTogether.map((item: WatchTogetherItem) => (
                <div
                  key={`${item.mediaType}-${item.tmdbId}`}
                  tabIndex={0}
                  className="glass-panel group relative overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-all duration-300 hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-amber-400 shadow-md"
                >
                  <div className="aspect-[2/3] w-full bg-stone-800 relative overflow-hidden">
                    {item.posterUrl ? (
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-stone-500">
                        <Film className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">Sem pôster</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-sm text-stone-200 border border-white/10">
                      {item.mediaType === 'movie' ? 'Filme' : 'Série'}
                    </span>
                  </div>
                  <div className="p-3">
                    <h5 className="font-semibold text-sm text-stone-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h5>
                    <span className="inline-block mt-1 text-[11px] text-amber-300/80 font-medium">
                      🍿 Na lista de ambos
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Consenso & Duelo */}
      {activeTab === 'ratedOverlap' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold font-['Cinzel'] text-stone-100 flex items-center gap-2">
              <Swords className="w-5 h-5 text-emerald-400" />
              Consenso & Duelo: Obras que ambos concluíram e avaliaram
            </h4>
            <span className="text-xs text-stone-400">
              {data.ratedOverlap.length} {data.ratedOverlap.length === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </div>

          {data.ratedOverlap.length === 0 ? (
            <GlassPanel className="p-8 text-center border-dashed border-white/10">
              <Swords className="w-12 h-12 text-stone-500 mx-auto mb-3" />
              <p className="text-stone-300 font-medium">Ainda não há obras avaliadas por ambos.</p>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Conforme vocês concluírem e avaliarem os mesmos filmes e séries com notas de 1 a 5 estrelas,
                o comparativo cirúrgico será revelado aqui.
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.ratedOverlap.map((item: RatedOverlapItem) => {
                const isConsensus = item.delta === 0;
                const isDuel = item.delta >= 2;

                return (
                  <GlassPanel
                    key={`${item.mediaType}-${item.tmdbId}`}
                    tabIndex={0}
                    className="p-4 flex gap-4 items-start border border-white/10 hover:border-amber-400/30 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {/* Poster miniatura */}
                    <div className="w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden bg-stone-800 shrink-0 border border-white/10">
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-500">
                          <Film className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Informações comparativas */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-bold text-stone-100 text-sm sm:text-base line-clamp-1">
                            {item.title}
                          </h5>
                          <span className="text-[11px] uppercase tracking-wider text-stone-400">
                            {item.mediaType === 'movie' ? 'Filme' : 'Série'}
                          </span>
                        </div>

                        {/* Tag de Consenso ou Duelo */}
                        {isConsensus ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                            <Sparkles className="w-3 h-3" /> Consenso
                          </span>
                        ) : isDuel ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                            <Flame className="w-3 h-3" /> Duelo ({item.delta}★)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-200 border border-amber-500/20 shrink-0">
                            Δ {item.delta}★
                          </span>
                        )}
                      </div>

                      {/* Comparativo de Notas Lado a Lado */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                        {/* Sua Nota */}
                        <div className="p-2 rounded-lg bg-black/20 border border-white/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-stone-400 font-medium">Você</span>
                            <div className="flex text-amber-400">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < item.myRating ? 'fill-amber-400' : 'text-stone-600'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {item.myReview && (
                            <p className="text-[11px] text-stone-300/90 italic line-clamp-2">
                              "{item.myReview}"
                            </p>
                          )}
                        </div>

                        {/* Nota do Amigo */}
                        <div className="p-2 rounded-lg bg-black/20 border border-white/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-stone-400 font-medium truncate max-w-[80px]">
                              {friendName}
                            </span>
                            <div className="flex text-amber-400">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < item.friendRating ? 'fill-amber-400' : 'text-stone-600'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {item.friendReview && (
                            <p className="text-[11px] text-stone-300/90 italic line-clamp-2">
                              "{item.friendReview}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 3: Recomendações do Amigo */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold font-['Cinzel'] text-stone-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              Descubra pelo Amigo: Obras que {data.friend.username} amou (4★ ou 5★)
            </h4>
            <span className="text-xs text-stone-400">
              {data.friendRecommendations.length} {data.friendRecommendations.length === 1 ? 'obra' : 'obras'}
            </span>
          </div>

          {data.friendRecommendations.length === 0 ? (
            <GlassPanel className="p-8 text-center border-dashed border-white/10">
              <Sparkles className="w-12 h-12 text-stone-500 mx-auto mb-3" />
              <p className="text-stone-300 font-medium">Nenhuma recomendação pendente.</p>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Ou você já assistiu a todas as obras favoritas de {data.friend.username}, ou seu amigo
                ainda não avaliou nenhuma obra com 4 ou 5 estrelas!
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.friendRecommendations.map((item: FriendRecommendationItem) => (
                <GlassPanel
                  key={`${item.mediaType}-${item.tmdbId}`}
                  tabIndex={0}
                  className="p-4 flex gap-4 items-start border border-white/10 hover:border-amber-400/30 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <div className="w-20 aspect-[2/3] rounded-lg overflow-hidden bg-stone-800 shrink-0 border border-white/10">
                    {item.posterUrl ? (
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-500">
                        <Film className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-2">
                    <div>
                      <h5 className="font-bold text-stone-100 text-sm line-clamp-1">{item.title}</h5>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < item.friendRating ? 'fill-amber-400' : 'text-stone-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-stone-400">
                          ({item.friendRating}★ por {friendName})
                        </span>
                      </div>

                      {item.friendReview && (
                        <p className="text-xs text-stone-300/80 italic mt-1.5 line-clamp-2">
                          "{item.friendReview}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      {item.inMyBacklog ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                          <Check className="w-3.5 h-3.5" /> Já no seu Quero Ver
                        </span>
                      ) : (
                        <button
                          type="button"
                          tabIndex={0}
                          onClick={() => addToBacklog(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 text-amber-200 text-xs font-semibold transition-all duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Quero Ver
                        </button>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
