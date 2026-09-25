import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  CheckCheck,
  Star,
  Tv,
  UserPlus,
  UserCheck,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { NotificationItem, NotificationType } from '../../types/notification';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (id: number) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onCheckEpisodes: () => Promise<number>;
}

export function NotificationCenter({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onCheckEpisodes,
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Fecha no ESC e gerencia foco
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Dá foco inicial ao fechar ou ao primeiro item para controle remoto TV
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await onMarkAsRead(notif.id);
    }

    if (notif.data?.actionUrl) {
      onClose();
      navigate(notif.data.actionUrl);
    } else if (notif.type === 'FRIEND_REQUEST' || notif.type === 'FRIEND_ACCEPTED') {
      onClose();
      navigate('/social');
    }
  };

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'NEW_EPISODE':
        return <Tv className="w-5 h-5 text-amber-400" />;
      case 'FRIEND_RATED':
        return <Star className="w-5 h-5 text-amber-400 fill-amber-400" />;
      case 'FRIEND_REQUEST':
        return <UserPlus className="w-5 h-5 text-emerald-400" />;
      case 'FRIEND_ACCEPTED':
        return <UserCheck className="w-5 h-5 text-emerald-400" />;
      case 'SYSTEM':
      default:
        return <Sparkles className="w-5 h-5 text-[var(--color-caramelo-claro)]" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} min`;
    if (hours < 24) return `Há ${hours} h`;
    if (days === 1) return 'Ontem';
    return `Há ${days} dias`;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl border border-white/20 shadow-2xl overflow-hidden bg-[var(--color-floresta-negra)]/95"
      >
        {/* Cabeçalho do Painel */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-caramelo-claro)]/20 border border-[var(--color-caramelo-claro)]/30 text-[var(--color-caramelo-claro)]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="notification-center-title"
                className="font-cinzel text-lg sm:text-xl font-bold text-[var(--color-caramelo-claro)]"
              >
                Notificações
              </h2>
              <p className="font-outfit text-xs text-[var(--color-seda-milharal)]/70">
                {unreadCount > 0
                  ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}`
                  : 'Nenhuma pendente'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Botão Checar Novos Episódios */}
            <button
              onClick={() => onCheckEpisodes()}
              title="Verificar novos episódios"
              aria-label="Verificar novos episódios"
              tabIndex={0}
              className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition tv-focus-glow min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Botão Marcar Todas como Lidas */}
            {unreadCount > 0 && (
              <button
                onClick={() => onMarkAllAsRead()}
                title="Marcar todas como lidas"
                aria-label="Marcar todas como lidas"
                tabIndex={0}
                className="p-2.5 rounded-xl text-white/70 hover:text-[var(--color-caramelo-claro)] hover:bg-white/10 active:scale-95 transition tv-focus-glow min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <CheckCheck className="w-5 h-5" />
              </button>
            )}

            {/* Botão Fechar Modal */}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              title="Fechar painel de notificações"
              aria-label="Fechar painel"
              tabIndex={0}
              className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition tv-focus-glow min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lista de Notificações com Rolagem Fluida */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-3 text-[var(--color-seda-milharal)]/40">
                <Bell className="w-8 h-8 stroke-[1.5]" />
              </div>
              <p className="font-outfit text-sm text-[var(--color-seda-milharal)]/70 font-medium">
                Nenhuma notificação por aqui.
              </p>
              <p className="font-outfit text-xs text-[var(--color-seda-milharal)]/50 mt-1 max-w-xs">
                Quando novos episódios forem lançados ou seus amigos avaliarem obras, você verá os avisos aqui.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(notif)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(notif);
                  }
                }}
                className={`p-3.5 rounded-2xl transition-all duration-200 cursor-pointer flex gap-3.5 items-start tv-focus-glow border ${
                  notif.read
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-[var(--color-seda-milharal)]/80'
                    : 'bg-[var(--color-caramelo-claro)]/[0.08] border-[var(--color-caramelo-claro)]/30 hover:bg-[var(--color-caramelo-claro)]/[0.14] text-[var(--color-seda-milharal)] shadow-md'
                }`}
              >
                {/* Ícone ou Poster */}
                <div className="flex-shrink-0 mt-0.5 relative">
                  {notif.data?.posterPath ? (
                    <img
                      src={notif.data.posterPath}
                      alt={notif.title}
                      className="w-12 h-16 object-cover rounded-xl shadow-md border border-white/10"
                    />
                  ) : notif.data?.authorAvatarUrl ? (
                    <img
                      src={notif.data.authorAvatarUrl}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                      {renderIcon(notif.type)}
                    </div>
                  )}

                  {!notif.read && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full ring-2 ring-[var(--color-floresta-negra)] shadow-sm" />
                  )}
                </div>

                {/* Conteúdo da Notificação */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-outfit font-semibold text-sm truncate text-[var(--color-caramelo-claro)]">
                      {notif.title}
                    </h3>
                    <span className="font-outfit text-[11px] text-[var(--color-seda-milharal)]/50 whitespace-nowrap">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <p className="font-outfit text-xs text-[var(--color-seda-milharal)]/80 mt-1 line-clamp-2">
                    {notif.message}
                  </p>

                  {/* Detalhe extra se tiver resenha ou episódio */}
                  {notif.data?.review && (
                    <div className="mt-2 p-2 rounded-lg bg-black/20 border border-white/5 text-[11px] font-outfit italic text-[var(--color-seda-milharal)]/70">
                      &ldquo;{notif.data.review}&rdquo;
                    </div>
                  )}

                  {/* Indicador de Ação */}
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-outfit text-[var(--color-caramelo-claro)] font-medium">
                    <span>Acessar</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé / Informação Multiplataforma */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-[var(--color-seda-milharal)]/50 font-outfit px-4">
          <span>Navegue com D-Pad na TV ou Toque no Celular</span>
          <span className="hidden sm:inline">ESC para fechar</span>
        </div>
      </div>
    </div>
  );
}
