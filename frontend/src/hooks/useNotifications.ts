import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { NotificationItem, NotificationsResponse } from '../types/notification';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(typeof data.count === 'number' ? data.count : 0);
      }
    } catch {
      // Ignora erro em polling leve
    }
  }, [user]);

  const fetchNotifications = useCallback(
    async (unreadOnly = false) => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/notifications?page=1&limit=30${unreadOnly ? '&unreadOnly=true' : ''}`);
        if (res.ok) {
          const data: NotificationsResponse = await res.json();
          setNotifications(data.notifications);
          setUnreadCount(data.pagination.unreadCount);
        } else {
          setError('Erro ao carregar notificações.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Falha na conexão com o servidor.');
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  const markAsRead = useCallback(async (id: number) => {
    try {
      const res = await apiFetch(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // Falha silenciosa com fallback na próxima listagem
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications/read-all', {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
        setUnreadCount(0);
      }
    } catch {
      // Falha silenciosa
    }
  }, []);

  const checkEpisodes = useCallback(async () => {
    if (!user) return 0;
    try {
      const res = await apiFetch('/notifications/check-episodes', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.newEpisodesFound > 0) {
          await fetchNotifications();
        }
        return data.newEpisodesFound;
      }
    } catch {
      // Silencioso
    }
    return 0;
  }, [user, fetchNotifications]);

  // Carrega unreadCount inicial e faz checagem de episódios ao logar
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
    checkEpisodes();

    // Polling leve a cada 45 segundos para atualizar contador de notificações
    const interval = setInterval(fetchUnreadCount, 45000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount, checkEpisodes]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    checkEpisodes,
  };
}
