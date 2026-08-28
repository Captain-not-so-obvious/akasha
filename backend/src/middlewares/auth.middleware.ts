import { prisma } from '../lib/prisma.js';
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
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await reply.status(401).send({ error: 'Token de autenticação ausente.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    request.log.error('SUPABASE_URL ou SUPABASE_ANON_KEY não configurado.');
    await reply.status(500).send({ error: 'Erro de configuração do servidor.' });
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      request.log.error(`Erro do Supabase ao validar token: ${res.status} - ${errBody}`);
      await reply.status(401).send({ error: 'Token inválido ou expirado.' });
      return;
    }

    const user = await res.json();
    request.userId = user.id;

    // Garante que o profile existe no banco, para que a foreign key do wishlist não falhe.
    await prisma.profile.upsert({
      where: { id: user.id },
      update: { 
        username: user.user_metadata?.full_name || user.email || 'Viajante',
        avatarUrl: user.user_metadata?.avatar_url || null
      },
      create: { 
        id: user.id,
        username: user.user_metadata?.full_name || user.email || 'Viajante',
        avatarUrl: user.user_metadata?.avatar_url || null
      }
    });

  } catch (err: any) {
    request.log.error('Erro de rede/validação ao contatar Supabase: %o', err);
    await reply.status(401).send({ error: 'Token inválido ou expirado.' });
  }
}
