import React, { useState, useEffect, useMemo } from 'react';
import { useFriendComparison } from '../../hooks/useFriendComparison';
import { AffinityBadge } from './AffinityBadge';
import { GlassPanel } from '../ui/GlassPanel';
import {
  ArrowLeft,
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Sparkles,
  Star,
  Plus,
  Check,
  Swords,
  Flame,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import type {
  DomainType,
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
type DomainFilterType = 'all' | 'audiovisual' | 'game' | 'book' | 'comic';

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  friendId,
  friendName,
  onBack,
}) => {
  const { data, isLoading, error, actionFeedback, refetch, addToBacklog } =
    useFriendComparison(friendId);

  const [activeTab, setActiveTab] = useState<TabType>('watchTogether');
  const [selectedDomain, setSelectedDomain] = useState<DomainFilterType>('all');

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

  // Função auxiliar para verificar match do filtro de domínio
  const matchesDomain = (domain: DomainType) => {
    if (selectedDomain === 'all') return true;
    if (selectedDomain === 'audiovisual') return domain === 'movie' || domain === 'tv';
    return domain === selectedDomain;
  };

  // Listas filtradas dinamicamente
  const filteredWatchTogether = useMemo(() => {
    if (!data) return [];
    return data.watchTogether.filter((item) => matchesDomain(item.domain));
  }, [data, selectedDomain]);

  const filteredRatedOverlap = useMemo(() => {
    if (!data) return [];
    return data.ratedOverlap.filter((item) => matchesDomain(item.domain));
  }, [data, selectedDomain]);

  const filteredRecommendations = useMemo(() => {
    if (!data) return [];
    return data.friendRecommendations.filter((item) => matchesDomain(item.domain));
  }, [data, selectedDomain]);

  // Metadados visuais de cada domínio
  const getDomainMeta = (domain: DomainType) => {
    switch (domain) {
      case 'game':
        return {
          label: 'Jogo',
          icon: Gamepad2,
          color: 'text-emerald-300',
          badgeBg: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200',
          actionText: 'Quero Jogar',
        };
      case 'book':
        return {
          label: 'Livro',
          icon: BookOpen,
          color: 'text-amber-200',
          badgeBg: 'bg-amber-600/20 border-amber-500/30 text-amber-200',
          actionText: 'Quero Ler',
        };
      case 'comic':
        return {
          label: 'HQ/Mangá',
          icon: Sparkles,
          color: 'text-purple-300',
          badgeBg: 'bg-purple-500/20 border-purple-500/30 text-purple-200',
          actionText: 'Quero Ler',
        };
      case 'tv':
        return {
          label: 'Série',
          icon: Tv,
          color: 'text-sky-300',
          badgeBg: 'bg-sky-500/20 border-sky-500/30 text-sky-200',
          actionText: 'Quero Assistir',
        };
      case 'movie':
      default:
        return {
          label: 'Filme',
          icon: Film,
          color: 'text-amber-300',
          badgeBg: 'bg-amber-400/20 border-amber-400/30 text-amber-200',
          actionText: 'Quero Assistir',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-amber-300 animate-spin" />
        <p className="text-stone-300 font-['Cinzel'] tracking-wider animate-pulse">
          Consultando os Registros Akáshicos e alinhando acervos universais...
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
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 transition focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="button"
            tabIndex={0}
            onClick={() => refetch()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-stone-300 hover:text-stone-100 transition duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:scale-105 cursor-pointer"
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
            Sincronia Cósmica com <strong className="text-amber-300">{data.friend.username}</strong>
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

      {/* Badge Principal de Afinidade Cósmica com Breakdown Multidomínio */}
      <AffinityBadge
        affinity={data.affinity}
        domainAffinities={data.domainAffinities}
        activeDomain={selectedDomain}
        onSelectDomain={(dom) =>
          setSelectedDomain(
            dom === 'all'
              ? 'all'
              : dom === 'movie' || dom === 'tv'
                ? 'audiovisual'
                : (dom as DomainFilterType)
          )
        }
      />

      {/* Seletor de Módulos Culturais (Filtro Superior) */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider mr-1">
          Filtrar Módulo:
        </span>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setSelectedDomain('all')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 ${
            selectedDomain === 'all'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-md'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Todas as Mídias</span>
        </button>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setSelectedDomain('audiovisual')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 ${
            selectedDomain === 'audiovisual'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-md'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Cinema & Séries</span>
        </button>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setSelectedDomain('game')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 ${
            selectedDomain === 'game'
              ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 shadow-md'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Jogos</span>
        </button>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setSelectedDomain('book')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 ${
            selectedDomain === 'book'
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-md'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Livros</span>
        </button>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setSelectedDomain('comic')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 ${
            selectedDomain === 'comic'
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-md'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quadrinhos & Mangás</span>
        </button>
      </div>

      {/* Seletor de Abas de Comparação */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          tabIndex={0}
          onClick={() => setActiveTab('watchTogether')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer ${
            activeTab === 'watchTogether'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-lg'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Curtir Juntos</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/40 text-stone-200 font-mono">
            {filteredWatchTogether.length}
          </span>
        </button>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setActiveTab('ratedOverlap')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer ${
            activeTab === 'ratedOverlap'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-lg'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Swords className="w-4 h-4 text-emerald-400" />
          <span>Consenso & Duelo</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/40 text-stone-200 font-mono">
            {filteredRatedOverlap.length}
          </span>
        </button>

        <button
          type="button"
          tabIndex={0}
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer ${
            activeTab === 'recommendations'
              ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-lg'
              : 'bg-white/5 text-stone-300 hover:bg-white/10 border border-transparent'
          }`}
        >
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>Recomendações de {data.friend.username}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-black/40 text-stone-200 font-mono">
            {filteredRecommendations.length}
          </span>
        </button>
      </div>

      {/* Conteúdo da Aba 1: Curtir Juntos */}
      {activeTab === 'watchTogether' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold font-['Cinzel'] text-stone-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Jornada Compartilhada: Obras que ambos querem curtir
            </h4>
            <span className="text-xs text-stone-400">
              {filteredWatchTogether.length}{' '}
              {filteredWatchTogether.length === 1 ? 'obra encontrada' : 'obras encontradas'}
            </span>
          </div>

          {filteredWatchTogether.length === 0 ? (
            <GlassPanel className="p-8 text-center border-dashed border-white/10">
              <Clock className="w-12 h-12 text-stone-500 mx-auto mb-3" />
              <p className="text-stone-300 font-medium">
                Nenhuma obra em comum no backlog para o filtro selecionado.
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Quando você e {data.friend.username} adicionarem os mesmos filmes, séries, jogos,
                livros ou mangás como "Quero Consumir", eles aparecerão aqui para planejar a jornada
                juntos!
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredWatchTogether.map((item: WatchTogetherItem) => {
                const meta = getDomainMeta(item.domain);
                const Icon = meta.icon;

                return (
                  <div
                    key={`${item.domain}-${item.externalId}`}
                    tabIndex={0}
                    className="glass-panel group relative overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-all duration-300 hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-amber-400 shadow-md"
                  >
                    <div className="aspect-[2/3] w-full bg-stone-800 relative overflow-hidden">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-stone-500">
                          <Icon className="w-8 h-8 mb-1" />
                          <span className="text-[10px]">Sem capa</span>
                        </div>
                      )}

                      {/* Badge do Módulo Cultural */}
                      <span
                        className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm border flex items-center gap-1 ${meta.badgeBg}`}
                      >
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>

                      {item.releaseYear && (
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/70 backdrop-blur-sm text-stone-300 border border-white/10">
                          {item.releaseYear}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h5 className="font-semibold text-sm text-stone-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </h5>
                      <span className="inline-block mt-1 text-[11px] text-amber-300/80 font-medium">
                        ✨ Na lista de ambos
                      </span>
                    </div>
                  </div>
                );
              })}
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
              Consenso & Duelo: Obras concluídas e avaliadas por ambos
            </h4>
            <span className="text-xs text-stone-400">
              {filteredRatedOverlap.length}{' '}
              {filteredRatedOverlap.length === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </div>

          {filteredRatedOverlap.length === 0 ? (
            <GlassPanel className="p-8 text-center border-dashed border-white/10">
              <Swords className="w-12 h-12 text-stone-500 mx-auto mb-3" />
              <p className="text-stone-300 font-medium">
                Ainda não há obras avaliadas por ambos no filtro selecionado.
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Conforme vocês concluírem e avaliarem os mesmos jogos, livros, filmes, séries ou
                mangás com notas de 1 a 5 estrelas, o comparativo cirúrgico será revelado aqui.
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRatedOverlap.map((item: RatedOverlapItem) => {
                const isConsensus = item.delta === 0;
                const isDuel = item.delta >= 2;
                const meta = getDomainMeta(item.domain);
                const Icon = meta.icon;

                return (
                  <GlassPanel
                    key={`${item.domain}-${item.externalId}`}
                    tabIndex={0}
                    className="p-4 flex gap-4 items-start border border-white/10 hover:border-amber-400/30 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {/* Poster miniatura */}
                    <div className="w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden bg-stone-800 shrink-0 border border-white/10 relative">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-500">
                          <Icon className="w-6 h-6" />
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
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${meta.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label} {item.releaseYear ? `(${item.releaseYear})` : ''}
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
              {filteredRecommendations.length}{' '}
              {filteredRecommendations.length === 1 ? 'obra' : 'obras'}
            </span>
          </div>

          {filteredRecommendations.length === 0 ? (
            <GlassPanel className="p-8 text-center border-dashed border-white/10">
              <Sparkles className="w-12 h-12 text-stone-500 mx-auto mb-3" />
              <p className="text-stone-300 font-medium">Nenhuma recomendação pendente no filtro.</p>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Ou você já avaliou todas as obras consagradas de {data.friend.username}, ou seu amigo
                ainda não avaliou itens desta categoria com 4 ou 5 estrelas!
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecommendations.map((item: FriendRecommendationItem) => {
                const meta = getDomainMeta(item.domain);
                const Icon = meta.icon;

                return (
                  <GlassPanel
                    key={`${item.domain}-${item.externalId}`}
                    tabIndex={0}
                    className="p-4 flex gap-4 items-start border border-white/10 hover:border-amber-400/30 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <div className="w-20 aspect-[2/3] rounded-lg overflow-hidden bg-stone-800 shrink-0 border border-white/10 relative">
                      {item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-500">
                          <Icon className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${meta.badgeBg}`}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                          {item.releaseYear && (
                            <span className="text-[11px] text-stone-400 font-mono">
                              {item.releaseYear}
                            </span>
                          )}
                        </div>

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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 text-amber-200 text-xs font-semibold transition-all duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {meta.actionText}
                          </button>
                        )}
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
