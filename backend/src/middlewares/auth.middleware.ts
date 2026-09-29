import { prisma } from '../lib/prisma.js';
import { generateFriendCode, generateInitialUsername } from '../lib/friendCode.js';
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

// Estende o tipo do Fastify para incluir userId — sem uso de 'any'
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
  user_metadata?: {
    avatar_url?: string;
    picture?: string;
    full_name?: string;
    name?: string;
  };
  avatar_url?: string;
  picture?: string;
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Extrai tokens em ordem de prioridade estrita:
  // 1. Cabeçalho Authorization: Bearer <token> (gerenciado dinamicamente pelo cliente Supabase com auto-refresh)
  // 2. Cookie HttpOnly access_token (armazenado pelo navegador)
  // 3. Query string (?token=...) (para SSE/MCP)
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

  const queryToken = (request.query as Record<string, string | undefined>)?.token?.trim();
  if (queryToken && !candidateTokens.includes(queryToken)) {
    candidateTokens.push(queryToken);
  }

  if (candidateTokens.length === 0 && !request.cookies?.refresh_token) {
    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host || 'akasha-backend.onrender.com';
    const baseUrl = `${protocol}://${host}`;
    reply.header(
      'WWW-Authenticate',
      `Bearer realm="akasha", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
    );
    await reply.status(401).send({ error: 'Token de autenticação ausente.' });
    return;
  }
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!supabaseUrl || !anonKey || !jwtSecret) {
    request.log.error('SUPABASE_URL, SUPABASE_ANON_KEY ou SUPABASE_JWT_SECRET não configurado.');
    await reply.status(500).send({ error: 'Erro de configuração do servidor.' });
    return;
  }

  try {
    let userId: string | null = null;
    let email: string | undefined = undefined;
    let avatarUrl: string | undefined = undefined;

    // Tenta validar os tokens candidatos na ordem de prioridade
    for (const token of candidateTokens) {
      try {
        // 1. Tentar validar o token localmente (Stateless)
        const decoded = jwt.verify(token, jwtSecret) as SupabaseJwtPayload;
        userId = decoded.sub;
        email = decoded.email;
        avatarUrl =
          decoded.user_metadata?.avatar_url ||
          decoded.user_metadata?.picture ||
          decoded.avatar_url ||
          decoded.picture;
        break; // Sucesso na validação local
      } catch (jwtErr) {
        // 2. Fallback: se a validação local falhar (ex: chave rotacionada), valida diretamente no Supabase
        try {
          const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: anonKey,
            },
          });

          if (res.ok) {
            const user = (await res.json()) as {
              id: string;
              email?: string;
              user_metadata?: { avatar_url?: string; picture?: string };
            };
            userId = user.id;
            email = user.email;
            avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
            break; // Sucesso na validação remota
          }
        } catch {
          // Continua para o próximo token candidato se houver
        }
      }
    }

    // 3. Fallback de resiliência: se o access_token expirou, tenta renovar usando o cookie refresh_token
    if (!userId && request.cookies?.refresh_token) {
      try {
        const refreshRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: request.cookies.refresh_token }),
        });

        if (refreshRes.ok) {
          const refreshed = (await refreshRes.json()) as {
            access_token: string;
            refresh_token: string;
            user: {
              id: string;
              email?: string;
              user_metadata?: { avatar_url?: string; picture?: string };
            };
          };

          userId = refreshed.user.id;
          email = refreshed.user.email;
          avatarUrl = refreshed.user.user_metadata?.avatar_url || refreshed.user.user_metadata?.picture;

          // Atualiza os cookies HttpOnly para manter a sessão sincronizada
          const isProduction = process.env.NODE_ENV === 'production';
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
      } catch (refreshErr) {
        request.log.warn({ err: refreshErr }, 'Falha na renovação de sessão via refresh_token');
      }
    }

    if (!userId) {
      reply.header('WWW-Authenticate', 'Bearer realm="akasha", error="invalid_token"');
      await reply.status(401).send({ error: 'Token inválido ou expirado.' });
      return;
    }

    request.userId = userId;

    // Garante que o profile existe no banco com email, friendCode e avatarUrl inicializados
    const existing = await prisma.profile.findUnique({
      where: { id: request.userId },
      select: { id: true, email: true, friendCode: true, avatarUrl: true },
    });

    if (!existing) {
      const friendCode = generateFriendCode();
      const initialUsername = generateInitialUsername(email, friendCode);

      await prisma.profile.create({
        data: {
          id: request.userId,
          email: email || null,
          username: initialUsername,
          friendCode,
          avatarUrl: avatarUrl || null,
        },
      });
    } else if (
      !existing.friendCode ||
      (email && !existing.email) ||
      (!existing.avatarUrl && avatarUrl)
    ) {
      await prisma.profile.update({
        where: { id: request.userId },
        data: {
          ...(email && !existing.email ? { email } : {}),
          ...(!existing.friendCode ? { friendCode: generateFriendCode() } : {}),
          ...(!existing.avatarUrl && avatarUrl ? { avatarUrl } : {}),
        },
      });
    }
  } catch (err: any) {
    request.log.error('Erro de validação do token: %o', err);
    reply.header('WWW-Authenticate', 'Bearer realm="akasha", error="invalid_token"');
    await reply.status(401).send({ error: 'Token inválido ou expirado.' });
  }
}

export const verifySupabaseAuth = authMiddleware;
