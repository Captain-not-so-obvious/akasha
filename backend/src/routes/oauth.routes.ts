import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

export const oauthRoutes: FastifyPluginAsync = async (fastify) => {
  
  // RFC 8414 - OAuth 2.0 Authorization Server Metadata
  fastify.get('/metadata', async (request, reply) => {
    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host;
    const baseUrl = `${protocol}://${host}`;
    return reply.send({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
      scopes_supported: ['mcp:read', 'mcp:write'],
    });
  });

  // RFC 9700 - OAuth Protected Resource Metadata
  fastify.get('/resource-metadata', async (request, reply) => {
    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host;
    const baseUrl = `${protocol}://${host}`;
    return reply.send({
      resource: `${baseUrl}/mcp/sse`,
      authorization_servers: [baseUrl],
      scopes_supported: ['mcp:read', 'mcp:write']
    });
  });

  // GET /oauth/authorize
  fastify.get('/authorize', async (request, reply) => {
    const query = request.query as any;
    const clientId = query.client_id || 'spark';
    const redirectUri = query.redirect_uri;
    const state = query.state || '';
    
    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    // Tentar ler o cookie para verificar se o usuário já está logado
    const token = request.cookies.access_token;
    let userId: string | null = null;

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub: string };
        userId = payload.sub;
      } catch (err) {
        userId = null;
      }
    }

    // Se não estiver logado, redireciona para o frontend no login com um returnTo
    if (!userId) {
      const returnTo = encodeURIComponent(`/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`);
      return reply.redirect(`${FRONTEND_URL}/login?returnTo=${returnTo}`);
    }

    // Se estiver logado, cria o código no banco
    // A expiração é em 5 minutos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const code = crypto.randomUUID();
    
    const oauthCode = await prisma.oAuthCode.create({
      data: {
        code,
        userId,
        clientId,
        redirectUri,
        expiresAt,
      }
    });

    // Monta a URL de redirecionamento de volta ao app cliente (Spark)
    const separator = redirectUri.includes('?') ? '&' : '?';
    let targetUrl = `${redirectUri}${separator}code=${oauthCode.code}`;
    if (state) {
      targetUrl += `&state=${state}`;
    }

    return reply.redirect(targetUrl);
  });

  // POST /oauth/token
  fastify.post('/token', async (request, reply) => {
    const body = request.body as any;
    const code = body?.code;
    const grantType = body?.grant_type || 'authorization_code';

    if (grantType !== 'authorization_code' || !code) {
      return reply.status(400).send({ error: 'invalid_grant', error_description: 'Código de autorização necessário.' });
    }

    // Buscar no banco
    const oauthCode = await prisma.oAuthCode.findUnique({ where: { code } });

    if (!oauthCode || oauthCode.used || oauthCode.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'invalid_grant', error_description: 'Código inválido ou expirado.' });
    }

    // Marcar como usado
    await prisma.oAuthCode.update({
      where: { code },
      data: { used: true },
    });

    // Gerar JWT Stateless para o Access Token (30 dias)
    // Assinamos com o SUPABASE_JWT_SECRET para o authMiddleware funcionar automaticamente!
    const accessToken = jwt.sign(
      { 
        sub: oauthCode.userId,
        type: 'oauth_mcp'
      }, 
      process.env.SUPABASE_JWT_SECRET!, 
      { expiresIn: '30d' }
    );

    return reply.send({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60, // 30 dias em segundos
    });
  });
};
