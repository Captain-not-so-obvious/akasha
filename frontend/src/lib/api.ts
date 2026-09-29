import { supabase } from './supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

/**
 * Funçao auxiliar centralizada para requisições ao backend do Akasha.
 * Garante o envio de cookies (credentials: 'include') e injeta automaticamente
 * o token de autenticação Supabase via cabeçalho 'Authorization: Bearer <token>',
 * prevenindo falhas de 401 provocadas pelo bloqueio de cookies terceiros em navegadores.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers || {});
  
  const hasBody = options.body !== undefined && options.body !== null && options.body !== '';
  if (hasBody && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.access_token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BACKEND_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Se a requisição falhar com 401 (token expirado), tenta renovar a sessão uma vez e retentar
  if (res.status === 401) {
    try {
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (refreshData?.session?.access_token) {
        headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
        res = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    } catch {
      // Ignora erro no refresh e preserva a resposta original
    }
  }

  return res;
}
