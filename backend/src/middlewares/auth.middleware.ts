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
  // Lê primeiramente do cookie HttpOnly
  let token = request.cookies.access_token || '';

  // Fallback: se não tiver no cookie, tenta pegar da query (útil para SSE/MCP)
  if (!token && (request.query as any)?.token) {
    token = (request.query as any).token;
  }

  // Mantemos o Header como fallback caso queira testar a API no Insomnia/Postman localmente sem cookie
  if (!token && request.headers.authorization?.startsWith('Bearer ')) {
    token = request.headers.authorization.split(' ')[1];
  }

  if (!token) {
    reply.header('WWW-Authenticate', 'Bearer realm="akasha"');
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
    // 1. Tentar validar o token localmente (Stateless)
    const decoded = jwt.verify(token, jwtSecret) as SupabaseJwtPayload;
    request.userId = decoded.sub;
    
    // Garante que o profile existe no banco, para que a foreign key do wishlist não falhe.
    await prisma.profile.upsert({
      where: { id: request.userId },
      update: { 
        // Em um JWT puro talvez não tenhamos user_metadata. Se não tiver, preserva o antigo.
      },
      create: { 
        id: request.userId,
        username: decoded.email || 'Viajante',
        avatarUrl: null
      }
    });
  } catch (err: any) {
    request.log.error('Erro de validação do token: %o', err);
    reply.header('WWW-Authenticate', 'Bearer realm="akasha", error="invalid_token"');
    await reply.status(401).send({ error: 'Token inválido ou expirado.' });
  }
}
