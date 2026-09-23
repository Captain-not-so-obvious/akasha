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
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Lê primeiramente do cookie HttpOnly
  let token = request.cookies?.access_token || '';

  // Fallback: se não tiver no cookie, tenta pegar da query (útil para SSE/MCP)
  if (!token && (request.query as any)?.token) {
    token = (request.query as any).token;
  }

  // Mantemos o Header como fallback caso queira testar a API no Insomnia/Postman localmente sem cookie
  if (!token && request.headers.authorization?.startsWith('Bearer ')) {
    token = request.headers.authorization.split(' ')[1];
  }

  if (!token) {
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

    // 1. Tentar validar o token localmente (Stateless)
    try {
      const decoded = jwt.verify(token, jwtSecret) as SupabaseJwtPayload;
      userId = decoded.sub;
      email = decoded.email;
    } catch (jwtErr) {
      // 2. Fallback: se a validação local falhar (ex: segredo JWT incorreto ou chave assimétrica), valida diretamente na API do Supabase
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
      });

      if (res.ok) {
        const user = await res.json();
        userId = user.id;
        email = user.email;
      } else {
        throw jwtErr;
      }
    }

    if (!userId) {
      reply.header('WWW-Authenticate', 'Bearer realm="akasha", error="invalid_token"');
      await reply.status(401).send({ error: 'Token inválido ou expirado.' });
      return;
    }

    request.userId = userId;

    // Garante que o profile existe no banco com email e friendCode inicializados
    const existing = await prisma.profile.findUnique({
      where: { id: request.userId },
      select: { id: true, email: true, friendCode: true },
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
          avatarUrl: null,
        },
      });
    } else if (!existing.friendCode || (email && !existing.email)) {
      await prisma.profile.update({
        where: { id: request.userId },
        data: {
          ...(email && !existing.email ? { email } : {}),
          ...(!existing.friendCode ? { friendCode: generateFriendCode() } : {}),
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
