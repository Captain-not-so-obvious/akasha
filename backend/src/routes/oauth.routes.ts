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
      code_challenge_methods_supported: ['S256', 'plain'],
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
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
      scopes_supported: ['mcp:read', 'mcp:write']
    });
  });

  // GET /oauth/authorize — Redireciona o navegador para a tela de consentimento no Frontend
  fastify.get('/authorize', async (request, reply) => {
    const query = request.query as any;
    const clientId = query.client_id || 'spark';
    const redirectUri = query.redirect_uri || '';
    const state = query.state || '';
    
    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    const frontendAuthorizeUrl = `${FRONTEND_URL}/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    return reply.redirect(frontendAuthorizeUrl);
  });

  // POST /oauth/confirm — Chamado pela página de consentimento do Frontend para gerar o código e finalizar
  fastify.post('/confirm', async (request, reply) => {
    let body = request.body as any;
    if (typeof body === 'string') {
      try {
        body = Object.fromEntries(new URLSearchParams(body));
      } catch {
        body = {};
      }
    }

    const clientId = body?.client_id || (request.query as any)?.client_id || 'spark';
    const redirectUri = body?.redirect_uri || (request.query as any)?.redirect_uri;
    const state = body?.state || (request.query as any)?.state || '';

    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    // Tentar ler o token via header Authorization, query param ou cookie
    let token = (request.query as any)?.token || (request.query as any)?.access_token || request.cookies?.access_token;
    if (!token && request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.split(' ')[1];
    }

    let userId: string | null = null;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub: string };
        userId = payload.sub;
      } catch (err) {
        userId = null;
      }
    }

    if (!userId) {
      return reply.status(401).send({ error: 'Usuário não autenticado.' });
    }

    try {
      // Garantir que o perfil existe na tabela 'profiles' para não violar a chave estrangeira em 'oauth_codes'
      await prisma.profile.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
      });

      // Cria o código de autorização no banco de dados (expira em 5 minutos)
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

      const separator = redirectUri.includes('?') ? '&' : '?';
      let targetUrl = `${redirectUri}${separator}code=${oauthCode.code}`;
      if (state) {
        targetUrl += `&state=${state}`;
      }

      return reply.send({ redirect_url: targetUrl });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: `Erro ao gerar código de autorização: ${err.message}` });
    }
  });



  // POST /oauth/token
  fastify.post('/token', async (request, reply) => {
    let body = request.body as any;
    if (typeof body === 'string') {
      try {
        body = Object.fromEntries(new URLSearchParams(body));
      } catch {
        body = {};
      }
    }
    
    let code = body?.code || (request.query as any)?.code;
    let grantType = body?.grant_type || (request.query as any)?.grant_type || 'authorization_code';

    if (grantType !== 'authorization_code' || !code) {
      return reply.status(400).send({ 
        error: 'invalid_grant', 
        error_description: 'Código de autorização necessário.' 
      });
    }

    // Buscar no banco
    const oauthCode = await prisma.oAuthCode.findUnique({ where: { code } });

    if (!oauthCode || oauthCode.used || oauthCode.expiresAt < new Date()) {
      return reply.status(400).send({ 
        error: 'invalid_grant', 
        error_description: 'Código inválido ou expirado.' 
      });
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

  // GET /oauth/userinfo - OpenID Connect UserInfo endpoint
  fastify.get('/userinfo', async (request, reply) => {
    let token = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.split(' ')[1]
      : request.cookies.access_token;

    if (!token) {
      return reply.status(401).send({ error: 'unauthorized' });
    }

    try {
      const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub: string };
      return reply.send({ sub: payload.sub });
    } catch {
      return reply.status(401).send({ error: 'invalid_token' });
    }
  });
};

