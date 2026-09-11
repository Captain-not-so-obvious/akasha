import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

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

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'akasha-mcp-jwt-secret-2026-v1';
const isUuid = (str: string) => typeof str === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

  // Helper para identificar usuário logado via cookie / header / query token
  async function resolveUserId(request: any): Promise<string | null> {
    let token = (request.query as any)?.token || (request.query as any)?.access_token || request.cookies?.access_token;
    if (!token && request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.split(' ')[1].trim();
    }

    if (!token) return null;

    // 1. Tenta verificar via JWT usando JWT_SECRET
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
      if (payload?.sub) return payload.sub;
    } catch {}

    // 2. Tenta decodificar se for token do tipo oauth_mcp emitido pelo Akasha
    try {
      const payload = jwt.decode(token) as { sub: string; type?: string };
      if (payload?.sub && payload?.type === 'oauth_mcp') {
        if (isUuid(payload.sub)) {
          const profile = await prisma.profile.findUnique({ where: { id: payload.sub } });
          if (profile) return profile.id;
        } else {
          const profile = await prisma.profile.findFirst({ where: { username: payload.sub } });
          if (profile) return profile.id;
        }
      }
    } catch {}

    // 3. Fallback: Tenta autenticar na API do Supabase Auth
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

  // Renderiza a página HTML Server-Side de Autorização (Arquitetura SmartBolsa / RFC 6749)
  function renderAuthorizeHtml(clientId: string, redirectUri: string, state: string, userId: string | null, error?: string): string {
    const userBadgeHtml = userId
      ? `<div class="user-badge"><div><div class="user-info">${userId}</div><span class="user-auth-type">Conta Autenticada</span></div></div>`
      : '';

    const errorAlertHtml = error
      ? `<div class="alert">${error}</div>`
      : '';

    const inputEmailHtml = !userId
      ? `<div class="input-group"><label>E-mail ou ID do Usuário Akasha</label><input type="text" name="username" required placeholder="seu.email@gmail.com"></div>`
      : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autorizar Conexão — Akasha</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b110d;
      color: #f1ebd9;
      font-family: 'Outfit', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .glow-1 {
      position: absolute;
      top: -8rem; left: -8rem;
      width: 24rem; height: 24rem;
      border-radius: 9999px;
      background: #2d4030;
      opacity: 0.25;
      filter: blur(100px);
      pointer-events: none;
    }
    .glow-2 {
      position: absolute;
      bottom: -8rem; right: -8rem;
      width: 24rem; height: 24rem;
      border-radius: 9999px;
      background: #b86b35;
      opacity: 0.25;
      filter: blur(120px);
      pointer-events: none;
    }
    .card {
      background: rgba(18, 28, 21, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 2.5rem 2rem;
      max-width: 460px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      text-align: center;
      position: relative;
      z-index: 10;
    }
    .header-logos {
      display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1rem;
    }
    .title {
      font-family: 'Cinzel', serif;
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #f1ebd9;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      font-size: 0.875rem;
      color: rgba(241, 235, 217, 0.75);
      margin-bottom: 1.5rem;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #d4a373, transparent);
      opacity: 0.3;
      margin-bottom: 1.5rem;
    }
    .user-badge {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.75rem 1rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .user-info { font-size: 0.875rem; font-weight: 600; color: #ffffff; }
    .user-auth-type { font-size: 0.75rem; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 0.2rem 0.6rem; border-radius: 6px; }
    .alert { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 0.75rem; border-radius: 10px; font-size: 0.85rem; margin-bottom: 1.25rem; text-align: left; }
    .input-group { margin-bottom: 1.25rem; text-align: left; }
    .input-group label { display: block; font-size: 0.8rem; color: #f59e0b; margin-bottom: 0.4rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .input-group input {
      width: 100%;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(0, 0, 0, 0.4);
      color: #fff;
      font-size: 0.95rem;
      outline: none;
    }
    .input-group input:focus { border-color: #f59e0b; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2); }
    .permissions { background: rgba(0, 0, 0, 0.25); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; border: 1px solid rgba(255, 255, 255, 0.05); text-align: left; }
    .permissions h4 { font-size: 0.75rem; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem; }
    .permissions ul { list-style: none; font-size: 0.8rem; color: rgba(241, 235, 217, 0.8); }
    .permissions li { margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem; }
    .btn {
      width: 100%;
      padding: 0.95rem;
      background: #f59e0b;
      color: #0b110d;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover { background: #d97706; }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>
  <div class="card">
    <div class="header-logos">
      <div style="font-family: 'Cinzel', serif; font-size: 1.5rem; font-weight: 700; color: #f1ebd9;">AKASHA</div>
    </div>
    <div class="title">AUTORIZAR INTEGRAÇÃO</div>
    <div class="subtitle">Conectar conta ao <strong>Google Spark</strong></div>
    <div class="divider"></div>

    ${userBadgeHtml}
    ${errorAlertHtml}

    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${clientId}">
      <input type="hidden" name="redirect_uri" value="${redirectUri}">
      <input type="hidden" name="state" value="${state}">

      ${inputEmailHtml}

      <div class="permissions">
        <h4>Permissões autorizadas para a IA:</h4>
        <ul>
          <li>✓ Visualizar e atualizar sua lista de mídias (Wishlist)</li>
          <li>✓ Registrar avaliações (1 a 5 estrelas) de filmes e séries</li>
          <li>✓ Obter recomendações personalizadas via Inteligência Artificial</li>
        </ul>
      </div>

      <button type="submit" class="btn">Autorizar Conexão</button>
    </form>
  </div>
</body>
</html>`;
  }

  // GET /oauth/authorize — Renderiza a página HTML Server-Side de Autorização (Arquitetura SmartBolsa)
  fastify.get('/authorize', async (request, reply) => {
    const query = request.query as any;
    const clientId = query.client_id || 'spark';
    let redirectUri = query.redirect_uri || '';
    const state = query.state || '';

    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    if (redirectUri.includes('%3A') || redirectUri.includes('%2F')) {
      try { redirectUri = decodeURIComponent(redirectUri); } catch {}
    }

    const userId = await resolveUserId(request);
    const html = renderAuthorizeHtml(clientId, redirectUri, state, userId);
    return reply.type('text/html').send(html);
  });

  // POST /oauth/authorize — Processa a submissão do formulário e emite HTTP 302 Redirect direto para a URI do Spark!
  fastify.post('/authorize', async (request, reply) => {
    let body = request.body as any;
    if (typeof body === 'string') {
      try { body = Object.fromEntries(new URLSearchParams(body)); } catch {}
    }

    const clientId = body?.client_id || (request.query as any)?.client_id || 'spark';
    let redirectUri = body?.redirect_uri || (request.query as any)?.redirect_uri || '';
    const state = body?.state || (request.query as any)?.state || '';
    const submittedUsername = body?.username?.trim();

    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    if (redirectUri.includes('%3A') || redirectUri.includes('%2F')) {
      try { redirectUri = decodeURIComponent(redirectUri); } catch {}
    }

    let userId = await resolveUserId(request);

    // Se o usuário digitou o e-mail no formulário
    if (!userId && submittedUsername) {
      const existingProfile = await prisma.profile.findFirst({
        where: isUuid(submittedUsername)
          ? { OR: [{ username: submittedUsername }, { id: submittedUsername }] }
          : { username: submittedUsername }
      });

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        userId = crypto.randomUUID();
        await prisma.profile.create({
          data: {
            id: userId,
            username: submittedUsername
          }
        });
      }
    }

    if (!userId) {
      const html = renderAuthorizeHtml(clientId, redirectUri, state, null, 'Por favor, informe seu e-mail cadastrado no Akasha.');
      return reply.type('text/html').send(html);
    }

    // Garantir que userId é um UUID válido antes de passar para Prisma @db.Uuid
    if (!isUuid(userId)) {
      const profile = await prisma.profile.findFirst({ where: { username: userId } });
      if (profile) {
        userId = profile.id;
      } else {
        const newId = crypto.randomUUID();
        await prisma.profile.create({
          data: { id: newId, username: userId }
        });
        userId = newId;
      }
    }

    // Garantir que o perfil existe no banco relacional
    await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, username: submittedUsername || 'Viajante' },
    });

    // Gera o código de autorização no banco (expira em 5 minutos)
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

    // Retorna HTTP 302 Found direto para a URI do Spark!
    const separator = redirectUri.includes('?') ? '&' : '?';
    let targetUrl = `${redirectUri}${separator}code=${code}`;
    if (state) {
      targetUrl += `&state=${state}`;
    }

    return reply.redirect(targetUrl);
  });

  // POST /oauth/confirm — Mantido para compatibilidade
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

    let activeUserId = userId;
    if (!isUuid(activeUserId)) {
      const profile = await prisma.profile.findFirst({ where: { username: activeUserId } });
      if (profile) {
        activeUserId = profile.id;
      } else {
        const newId = crypto.randomUUID();
        await prisma.profile.create({ data: { id: newId, username: activeUserId } });
        activeUserId = newId;
      }
    }

    await prisma.profile.upsert({
      where: { id: activeUserId },
      update: {},
      create: { id: activeUserId },
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

    // Buscar no banco pelo código de autorização
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
      JWT_SECRET, 
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
