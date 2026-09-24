import React from 'react';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { ActivityCard } from './ActivityCard';
import { Activity, RefreshCw, Loader2, Users } from 'lucide-react';

export const ActivityFeed: React.FC = () => {
  const { activities, isLoading, error, page, totalPages, loadMore, refresh } = useActivityFeed();

  return (
    <div className="space-y-4">
      {/* Top Header do Feed */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800/60">
        <div className="flex items-center gap-2 text-stone-200">
          <Activity className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-lg tracking-wide font-cinzel">Feed da Sua Rede</h3>
        </div>
        <button
          tabIndex={0}
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-300 bg-stone-900 border border-stone-800 hover:bg-stone-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Estado de Erro */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading Inicial */}
      {isLoading && activities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-stone-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <p className="text-sm">Buscando atualizações da sua rede...</p>
        </div>
      )}

      {/* Feed Vazio */}
      {!isLoading && activities.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl bg-stone-900/40 border border-stone-800/60 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-stone-800/80 border border-stone-700 flex items-center justify-center text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-stone-200 font-medium mb-1">Nenhuma atividade recente</h4>
            <p className="text-stone-400 text-sm max-w-sm">
              Conecte-se com amigos via Friend Code para acompanhar o que eles estão assistindo e avaliando em tempo real.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Atividades */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activities.map((act) => (
            <ActivityCard key={act.id} activity={act} />
          ))}
        </div>
      )}

      {/* Botão de Carregar Mais */}
      {page < totalPages && (
        <div className="flex justify-center pt-2">
          <button
            tabIndex={0}
            onClick={loadMore}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Carregar mais atividades</span>
          </button>
        </div>
      )}
    </div>
  );
};
