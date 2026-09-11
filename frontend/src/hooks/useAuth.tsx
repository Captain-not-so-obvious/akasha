import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Tentar recuperar o usuário pelo cookie via backend
    const restoreSession = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (mounted) setUser(data.user);
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão pelo backend:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restoreSession();

    // 2. Escutar mudanças (Ex: Redirect do OAuth que traz o token na URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setSession(session);
      
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setUser(session.user);
        // Envia os tokens para o backend gravar nos cookies HttpOnly
        try {
          await fetch(`${BACKEND_URL}/auth/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          });
        } catch (err) {
          console.error('Falha ao gravar cookies seguros no backend:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      setLoading(false);
      console.error('Erro no login via Google OAuth:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Limpa os cookies no backend
      await fetch(`${BACKEND_URL}/auth/session`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
    } catch (error) {
      console.error('Erro ao efetuar logout:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
