import React from 'react';
import type { ActivityItem } from '../types/activity';
import { Star, Play, CheckCircle2, Bookmark, EyeOff, Film, Tv, User } from 'lucide-react';

interface ActivityCardProps {
  activity: ActivityItem;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'agora mesmo';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `há ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `há ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `há ${diffInDays}d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const { profile, type, status, userRating, review, title, posterPath, mediaType, createdAt } = activity;

  const renderActionHeader = () => {
    if (type === 'RATED_MEDIA' && userRating) {
      return (
        <div className="flex items-center gap-1.5 text-amber-400 font-medium text-sm">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>Avaliou com {userRating}/5★</span>
        </div>
      );
    }

    if (type === 'STATUS_CHANGED' || type === 'ADDED_TO_LIST') {
      switch (status) {
        case 'watching':
          return (
            <div className="flex items-center gap-1.5 text-blue-400 font-medium text-sm">
              <Play className="w-4 h-4 fill-blue-400 text-blue-400" />
              <span>Começou a assistir</span>
            </div>
          );
        case 'completed':
          return (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Concluiu</span>
            </div>
          );
        case 'plan_to_watch':
          return (
            <div className="flex items-center gap-1.5 text-amber-200/80 font-medium text-sm">
              <Bookmark className="w-4 h-4 text-amber-200/80" />
              <span>Adicionou em Quero Assistir</span>
            </div>
          );
        case 'dropped':
          return (
            <div className="flex items-center gap-1.5 text-stone-400 font-medium text-sm">
              <EyeOff className="w-4 h-4 text-stone-400" />
              <span>Pausou / Abandonou</span>
            </div>
          );
        default:
          return (
            <div className="flex items-center gap-1.5 text-amber-200/80 font-medium text-sm">
              <Bookmark className="w-4 h-4 text-amber-200/80" />
              <span>Adicionou ao acervo</span>
            </div>
          );
      }
    }

    return null;
  };

  const posterUrl = posterPath
    ? posterPath.startsWith('http')
      ? posterPath
      : `https://image.tmdb.org/t/p/w185${posterPath}`
    : null;

  return (
    <div
      tabIndex={0}
      className="group relative flex gap-4 p-4 rounded-xl bg-stone-900/60 border border-stone-800/80 backdrop-blur-md transition-all duration-200 hover:bg-stone-800/60 hover:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-amber-400 focus:bg-stone-800/80 focus:scale-[1.02]"
    >
      {/* Poster da Mídia */}
      <div className="w-16 h-24 sm:w-20 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-stone-950 border border-stone-800 flex items-center justify-center relative">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title || 'Mídia'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="text-stone-600 flex flex-col items-center gap-1">
            {mediaType === 'movie' ? <Film className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
          </div>
        )}
        <span className="absolute bottom-1 right-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/80 text-stone-300 uppercase tracking-wider">
          {mediaType === 'movie' ? 'Filme' : 'Série'}
        </span>
      </div>

      {/* Conteúdo da Atividade */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Header com Avatar do Amigo e Ação */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.username || 'Usuário'}
                  className="w-6 h-6 rounded-full object-cover border border-amber-500/30 flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                </div>
              )}
              <span className="font-semibold text-stone-200 text-sm truncate">
                @{profile.username || 'amigo'}
              </span>
            </div>
            <span className="text-xs text-stone-500 whitespace-nowrap">
              {formatRelativeTime(createdAt)}
            </span>
          </div>

          {/* Badge da Ação */}
          <div className="mb-1">{renderActionHeader()}</div>

          {/* Título da Mídia */}
          <h4 className="text-base font-semibold text-stone-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
            {title || `Mídia #${activity.tmdbId}`}
          </h4>

          {/* Opinião / Resenha do Usuário */}
          {review && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-stone-950/60 border border-stone-800/80 text-xs sm:text-sm text-stone-300 italic font-outfit relative">
              <span className="text-[var(--color-caramelo-claro)] font-serif mr-1 text-sm font-bold">“</span>
              <span>{review}</span>
              <span className="text-[var(--color-caramelo-claro)] font-serif ml-1 text-sm font-bold">”</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
