import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://akasha-nine.vercel.app';

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

  // Helper para identificar usuário logado
  async function resolveUserId(request: any): Promise<string | null> {
    let token = (request.query as any)?.token || (request.query as any)?.access_token || request.cookies?.access_token;
    if (!token && request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.split(' ')[1].trim();
    }

    if (!token) return null;

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (jwtSecret) {
      try {
        const payload = jwt.verify(token, jwtSecret) as { sub: string };
        if (payload?.sub) return payload.sub;
      } catch {}
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: anonKey }
        });
        if (res.ok) {
          const u = await res.json();
          if (u?.id) return u.id;
        }
      } catch {}
    }

    return null;
  }

  // GET & POST /oauth/authorize - Handler unificado de autorização (Arquitetura SmartBolsa / RFC 6749)
  const handleAuthorizeRequest = async (request: any, reply: any) => {
    let body = request.body || {};
    if (typeof body === 'string') {
      try { body = Object.fromEntries(new URLSearchParams(body)); } catch {}
    }

    const clientId = body.client_id || (request.query as any)?.client_id || 'spark';
    let redirectUri = body.redirect_uri || (request.query as any)?.redirect_uri || '';
    const state = body.state || (request.query as any)?.state || '';

    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    if (redirectUri.includes('%3A') || redirectUri.includes('%2F')) {
      try { redirectUri = decodeURIComponent(redirectUri); } catch {}
    }

    const userId = await resolveUserId(request);

    // Se o usuário ESTÁ logado: gera o código e faz HTTP 302 REDIRECT direto para a URI do Spark!
    if (userId) {
      await prisma.profile.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
      });

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const code = crypto.randomUUID();

      await prisma.oAuthCode.create({
        data: {
          code,
          userId,
          clientId,
          redirectUri,
          expiresAt,
        }
      });

      const separator = redirectUri.includes('?') ? '&' : '?';
      let targetUrl = `${redirectUri}${separator}code=${code}`;
      if (state) {
        targetUrl += `&state=${state}`;
      }

      return reply.redirect(targetUrl);
    }

    // Se o usuário NÃO está logado: redireciona para a tela de Login do frontend com returnTo
    const returnTo = encodeURIComponent(`/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`);
    return reply.redirect(`${FRONTEND_URL}/login?returnTo=${returnTo}`);
  };

  fastify.get('/authorize', handleAuthorizeRequest);
  fastify.post('/authorize', handleAuthorizeRequest);

  // POST /oauth/confirm — Suporte adicional para requisições do frontend
  fastify.post('/confirm', async (request, reply) => {
    let body = request.body as any;
    if (typeof body === 'string') {
      try { body = Object.fromEntries(new URLSearchParams(body)); } catch {}
    }

    const clientId = body?.client_id || (request.query as any)?.client_id || 'spark';
    let redirectUri = body?.redirect_uri || (request.query as any)?.redirect_uri || '';
    const state = body?.state || (request.query as any)?.state || '';

    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    const userId = await resolveUserId(request);

    if (!userId) {
      return reply.status(401).send({ error: 'Usuário não autenticado.' });
    }

    await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const code = crypto.randomUUID();

    await prisma.oAuthCode.create({
      data: {
        code,
        userId,
        clientId,
        redirectUri,
        expiresAt,
      }
    });

    const separator = redirectUri.includes('?') ? '&' : '?';
    let targetUrl = `${redirectUri}${separator}code=${code}`;
    if (state) {
      targetUrl += `&state=${state}`;
    }

    return reply.send({ redirect_url: targetUrl });
  });

  // POST /oauth/token - Troca do código pelo token de acesso
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
      scope: 'mcp:read mcp:write',
    });
  });

  // GET /oauth/userinfo - OpenID Connect UserInfo endpoint
  fastify.get('/userinfo', async (request, reply) => {
    const userId = await resolveUserId(request);
    if (!userId) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
    return reply.send({ sub: userId });
  });
};
