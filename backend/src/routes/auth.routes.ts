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
    // Prioriza o token no header Authorization, com fallback para o cookie
    const candidateTokens: string[] = [];
    if (request.headers.authorization?.startsWith('Bearer ')) {
      const bearer = request.headers.authorization.split(' ')[1]?.trim();
      if (bearer) candidateTokens.push(bearer);
    }
    if (request.cookies?.access_token) {
      const cookieToken = request.cookies.access_token.trim();
      if (cookieToken && !candidateTokens.includes(cookieToken)) {
        candidateTokens.push(cookieToken);
      }
    }

    if (candidateTokens.length === 0 && !request.cookies?.refresh_token) {
      return reply.status(401).send({ error: 'Não autenticado' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    try {
      let authenticatedUser: unknown = null;

      for (const token of candidateTokens) {
        const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: anonKey || '',
          },
        });

        if (res.ok) {
          authenticatedUser = await res.json();
          break;
        }
      }

      // Se falhou mas temos refresh_token em cookie, tenta renovar a sessão
      if (!authenticatedUser && request.cookies?.refresh_token) {
        try {
          const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
              apikey: anonKey || '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: request.cookies.refresh_token }),
          });

          if (refreshRes.ok) {
            const refreshed = (await refreshRes.json()) as {
              access_token: string;
              refresh_token: string;
              user: unknown;
            };

            authenticatedUser = refreshed.user;

            const cookieOptions = {
              path: '/',
              httpOnly: true,
              secure: isProduction,
              sameSite: isProduction ? ('none' as const) : ('lax' as const),
              maxAge: 60 * 60 * 24 * 7, // 7 dias
            };
            reply.setCookie('access_token', refreshed.access_token, cookieOptions);
            reply.setCookie('refresh_token', refreshed.refresh_token, cookieOptions);
          }
        } catch {
          // Ignora erro no refresh
        }
      }

      if (!authenticatedUser) {
        return reply.status(401).send({ error: 'Sessão inválida ou expirada' });
      }

      return reply.send({ user: authenticatedUser });
    } catch (err) {
      return reply.status(500).send({ error: 'Erro ao validar sessão' });
    }
  });
};
