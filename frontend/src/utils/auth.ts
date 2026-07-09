import { supabase } from '../lib/supabase';

/**
 * Obtém o token de acesso JWT da sessão ativa do Supabase de forma segura.
 * Buscar a sessão assincronamente através do SDK do Supabase garante que sempre
 * obteremos um token válido e atualizado (lidando com refresh token sob o capô).
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Erro ao obter sessão do Supabase:', error);
      return null;
    }
    return data.session?.access_token || null;
  } catch (err) {
    console.error('Erro inesperado ao obter token de autenticação:', err);
    return null;
  }
}
