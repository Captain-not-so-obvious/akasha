import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { Friend, FriendRequestsData, BlockedUser } from '../types/social';

export function useSocial() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestsData>({ received: [], sent: [] });
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSocialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [friendsRes, requestsRes, blockedRes] = await Promise.all([
        apiFetch('/friends'),
        apiFetch('/friends/requests'),
        apiFetch('/friends/blocked'),
      ]);

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData);
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      }

      if (blockedRes.ok) {
        const blockedData = await blockedRes.json();
        setBlockedUsers(blockedData);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados sociais');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendFriendRequest = async (target: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ target: target.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Erro ao enviar solicitação.' };
      }

      await fetchSocialData();
      return { success: true, message: data.message || 'Solicitação enviada com sucesso!' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha na conexão com o servidor.',
      };
    }
  };

  const respondRequest = async (
    requestId: number,
    action: 'accept' | 'decline' | 'block'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch(`/friends/requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Erro ao processar solicitação.' };
      }

      await fetchSocialData();
      return { success: true, message: data.message || 'Solicitação processada.' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha ao processar solicitação.',
      };
    }
  };

  const removeFriend = async (friendId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch(`/friends/${friendId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Erro ao desfazer amizade.' };
      }

      await fetchSocialData();
      return { success: true, message: data.message || 'Amizade desfeita.' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha ao desfazer amizade.',
      };
    }
  };

  const blockUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch(`/friends/${userId}/block`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Erro ao bloquear usuário.' };
      }

      await fetchSocialData();
      return { success: true, message: data.message || 'Usuário bloqueado com sucesso.' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha ao bloquear usuário.',
      };
    }
  };

  const unblockUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch(`/friends/${userId}/unblock`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Erro ao desbloquear usuário.' };
      }

      await fetchSocialData();
      return { success: true, message: data.message || 'Usuário desbloqueado com sucesso.' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha ao desbloquear usuário.',
      };
    }
  };

  const regenerateFriendCode = async (): Promise<string | null> => {
    try {
      const res = await apiFetch('/friends/regenerate-code', {
        method: 'POST',
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.friendCode;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    fetchSocialData();
  }, [fetchSocialData]);

  return {
    friends,
    requests,
    blockedUsers,
    isLoading,
    error,
    fetchSocialData,
    sendFriendRequest,
    respondRequest,
    removeFriend,
    blockUser,
    unblockUser,
    regenerateFriendCode,
  };
}
