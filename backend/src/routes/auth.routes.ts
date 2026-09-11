import { FastifyPluginAsync } from 'fastify';

interface AuthSessionBody {
  access_token: string;
  refresh_token: string;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Rota chamada pelo frontend logo após o login no Supabase
  fastify.post<{ Body: AuthSessionBody }>('/session', async (request, reply) => {
    const { access_token, refresh_token } = request.body;

    if (!access_token || !refresh_token) {
      return reply.status(400).send({ error: 'Tokens não fornecidos' });
    }

    // Configura o cookie HttpOnly (SameSite=None para comunicação cross-site em produção Vercel <-> Render)
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
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
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
    };

    reply.clearCookie('access_token', cookieOptions);
    reply.clearCookie('refresh_token', cookieOptions);

    return reply.send({ success: true });
  });

  // Rota usada pelo frontend para restaurar o estado de autenticação após recarregar a página
  fastify.get('/me', async (request, reply) => {
    let token = request.cookies?.access_token;

    // Fallback: aceita o token no header Authorization caso o navegador bloqueie cookies cross-site
    if (!token && request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.split(' ')[1];
    }

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
