import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Aviso: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidas no arquivo .env'
  );
}

// Implementação de Storage em memória (não persiste entre reloads)
// Isso garante que o JWT nunca toque o disco/localStorage (protegendo contra XSS)
const inMemoryStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: inMemoryStorage,
    autoRefreshToken: false, // O backend vai gerenciar o refresh se necessário, ou podemos deixar o fluxo de BFF
    persistSession: false,
  }
});
