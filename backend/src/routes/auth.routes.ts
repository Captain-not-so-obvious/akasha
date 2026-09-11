import { FastifyPluginAsync } from 'fastify';

interface AuthSessionBody {
  access_token: string;
  refresh_token: string;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Rota chamada pelo frontend logo após o login no Supabase
  fastify.post<{ Body: AuthSessionBody }>('/session', async (request, reply) => {
    const { access_token, refresh_token } = request.body;

    if (!access_token || !refresh_token) {
      return reply.status(400).send({ error: 'Tokens não fornecidos' });
    }

    // Configura o cookie HttpOnly
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    };

    reply.setCookie('access_token', access_token, cookieOptions);
    reply.setCookie('refresh_token', refresh_token, cookieOptions);

    return reply.send({ success: true });
  });

  // Rota chamada pelo frontend no logout
  fastify.delete('/session', async (request, reply) => {
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    };

    reply.clearCookie('access_token', cookieOptions);
    reply.clearCookie('refresh_token', cookieOptions);

    return reply.send({ success: true });
  });

  // Rota usada pelo frontend para restaurar o estado de autenticação após recarregar a página
  fastify.get('/me', async (request, reply) => {
    const token = request.cookies.access_token;

    if (!token) {
      return reply.status(401).send({ error: 'Não autenticado' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey || '',
        },
      });

      if (!res.ok) {
        return reply.status(401).send({ error: 'Sessão inválida ou expirada' });
      }

      const user = await res.json();
      return reply.send({ user });
    } catch (err) {
      return reply.status(500).send({ error: 'Erro ao validar sessão' });
    }
  });
};
