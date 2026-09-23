import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { UserProfileData } from '../types/social';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/profile/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao carregar perfil.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha na conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUsername = async (username: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch('/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Erro ao atualizar nome de usuário.' };
      }

      setProfile(prev => (prev ? { ...prev, username: data.profile.username } : null));
      return { success: true, message: 'Nome de usuário atualizado com sucesso!' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha ao atualizar nome de usuário.',
      };
    }
  };

  const updateAvatar = async (avatarUrl: string | null): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch('/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Erro ao atualizar foto de perfil.' };
      }

      setProfile(prev => (prev ? { ...prev, avatarUrl: data.profile.avatarUrl } : null));
      return { success: true, message: 'Foto de perfil atualizada com sucesso!' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha ao atualizar foto de perfil.',
      };
    }
  };

  const setFriendCodeLocally = (newCode: string) => {
    setProfile(prev => (prev ? { ...prev, friendCode: newCode } : null));
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateUsername,
    updateAvatar,
    setFriendCodeLocally,
  };
}
