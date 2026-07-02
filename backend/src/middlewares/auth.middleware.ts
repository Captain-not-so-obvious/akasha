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
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    request.log.error('SUPABASE_JWT_SECRET não configurado.');
    await reply.status(500).send({ error: 'Erro de configuração do servidor.' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as SupabaseJwtPayload;
    request.userId = payload.sub;
  } catch {
    await reply.status(401).send({ error: 'Token inválido ou expirado.' });
  }
}
