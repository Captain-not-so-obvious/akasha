import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { escapeHtml, isAllowedRedirectUri, verifyCodeChallenge } from '../lib/oauthValidator.js';
import { signMcpToken, verifyMcpToken } from '../lib/mcpToken.js';

interface AuthorizeQuery {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  scope?: string;
}

interface AuthorizeBody {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  scope?: string;
}

interface TokenBody {
  grant_type?: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  code_verifier?: string;
}

interface AuthenticatedOAuthUser {
  id: string;
  email?: string | null;
}

/**
 * Identifica com segurança o usuário autenticado via cookies HttpOnly ou Bearer token Supabase.
 * Previne falsificação de identidade (LGPD Art. 46).
 */
async function resolveAuthenticatedUser(request: FastifyRequest): Promise<AuthenticatedOAuthUser | null> {
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

  if (candidateTokens.length === 0) return null;

  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  for (const token of candidateTokens) {
    // 1. Tenta verificar token MCP existente
    const mcpUserId = await verifyMcpToken(token);
    if (mcpUserId) {
      const profile = await prisma.profile.findUnique({
        where: { id: mcpUserId },
        select: { id: true, email: true },
      });
      if (profile) return profile;
    }

    // 2. Tenta verificar como token JWT do Supabase
    if (supabaseJwtSecret) {
      try {
        const decoded = jwt.verify(token, supabaseJwtSecret) as { sub?: string; email?: string };
        if (decoded?.sub) {
          return { id: decoded.sub, email: decoded.email };
        }
      } catch {}
    }

    // 3. Fallback para verificação remota no Supabase Auth
    if (supabaseUrl && anonKey) {
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
        });
        if (res.ok) {
          const u = (await res.json()) as { id?: string; email?: string };
          if (u?.id) return { id: u.id, email: u.email };
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Renderiza página HTML Server-Side de Autorização com proteção XSS (escapeHtml).
 */
function renderAuthorizeHtml(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
  user: AuthenticatedOAuthUser | null;
  error?: string;
  frontendUrl: string;
}): string {
  const { clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scope, user, error, frontendUrl } = params;

  const safeClientId = escapeHtml(clientId);
  const safeRedirectUri = escapeHtml(redirectUri);
  const safeState = escapeHtml(state);
  const safeChallenge = escapeHtml(codeChallenge || '');
  const safeChallengeMethod = escapeHtml(codeChallengeMethod || 'S256');
  const safeScope = escapeHtml(scope || 'mcp:read mcp:write');
  const safeUserEmail = user ? escapeHtml(user.email || user.id) : '';

  const userBadgeHtml = user
    ? `<div class="user-badge"><div><div class="user-info">${safeUserEmail}</div><span class="user-auth-type">Conta Autenticada</span></div></div>`
    : '';

  const errorAlertHtml = error ? `<div class="alert">${escapeHtml(error)}</div>` : '';

  const returnToUrl = `/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}${codeChallenge ? `&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=${encodeURIComponent(codeChallengeMethod || 'S256')}` : ''}`;

  const actionFormHtml = user
    ? `
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${safeClientId}">
      <input type="hidden" name="redirect_uri" value="${safeRedirectUri}">
      <input type="hidden" name="state" value="${safeState}">
      <input type="hidden" name="code_challenge" value="${safeChallenge}">
      <input type="hidden" name="code_challenge_method" value="${safeChallengeMethod}">
      <input type="hidden" name="scope" value="${safeScope}">

      <div class="permissions">
        <h4>Permissões autorizadas para o agente:</h4>
        <ul>
          <li>✓ Visualizar e atualizar sua lista de mídias (Wishlist)</li>
          <li>✓ Registrar avaliações (1 a 5 estrelas) de filmes, séries, livros e games</li>
          <li>✓ Obter recomendações personalizadas via IA do Akasha</li>
        </ul>
      </div>

      <button type="submit" class="btn">Autorizar Conexão</button>
    </form>`
    : `
    <div class="login-notice">
      <p style="font-size: 0.9rem; margin-bottom: 1.25rem; color: rgba(241, 235, 217, 0.85);">
        Para autorizar o aplicativo <strong>${safeClientId}</strong> a interagir com seu acervo, é necessário estar conectado na sua conta Akasha.
      </p>
      <a href="${frontendUrl}/login?returnTo=${encodeURIComponent(returnToUrl)}" class="btn" style="text-decoration: none; display: block; text-align: center;">
        Entrar no Akasha com o Google
      </a>
    </div>`;

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
    .user-info { font-size: 0.875rem; font-weight: 600; color: #ffffff; word-break: break-all; }
    .user-auth-type { font-size: 0.75rem; color: #34d399; background: rgba(52, 211, 153, 0.1); padding: 0.2rem 0.6rem; border-radius: 6px; }
    .alert { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 0.75rem; border-radius: 10px; font-size: 0.85rem; margin-bottom: 1.25rem; text-align: left; }
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
    <div class="subtitle">Conectar conta ao cliente <strong>${safeClientId}</strong></div>
    <div class="divider"></div>

    ${userBadgeHtml}
    ${errorAlertHtml}
    ${actionFormHtml}
  </div>
</body>
</html>`;
}

export const oauthRoutes: FastifyPluginAsync = async (fastify) => {
  // Helper para URL base dinâmica
  const getBaseUrl = (request: FastifyRequest) => {
    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host || 'akasha-backend.onrender.com';
    return `${protocol}://${host}`;
  };

  // RFC 8414 - OAuth 2.0 Authorization Server Metadata
  fastify.get('/metadata', async (request, reply) => {
    const baseUrl = getBaseUrl(request);
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

  // RFC 9728 - OAuth Protected Resource Metadata
  fastify.get('/resource-metadata', async (request, reply) => {
    const baseUrl = getBaseUrl(request);
    return reply.send({
      resource: `${baseUrl}/mcp`,
      authorization_servers: [baseUrl],
      scopes_supported: ['mcp:read', 'mcp:write'],
    });
  });

  // GET /oauth/authorize — Renderiza a página HTML Server-Side de Autorização
  fastify.get('/authorize', async (request: FastifyRequest<{ Querystring: AuthorizeQuery }>, reply: FastifyReply) => {
    const query = request.query;
    const clientId = query.client_id || 'spark';
    let redirectUri = query.redirect_uri || '';
    const state = query.state || '';
    const codeChallenge = query.code_challenge;
    const codeChallengeMethod = query.code_challenge_method || 'S256';
    const scope = query.scope || 'mcp:read mcp:write';

    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    if (redirectUri.includes('%3A') || redirectUri.includes('%2F')) {
      try {
        redirectUri = decodeURIComponent(redirectUri);
      } catch {}
    }

    // Validação estrita de redirect_uri contra Open Redirect
    if (!isAllowedRedirectUri(redirectUri)) {
      request.log.warn({ redirectUri }, 'Tentativa de OAuth com redirect_uri não autorizado.');
      return reply.status(400).send({
        error: 'redirect_uri_unauthorized',
        message: 'A URL de redirecionamento fornecida não está autorizada na política de segurança do Akasha.',
      });
    }

    const user = await resolveAuthenticatedUser(request);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const html = renderAuthorizeHtml({
      clientId,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
      scope,
      user,
      frontendUrl,
    });

    return reply.type('text/html').send(html);
  });

  // POST /oauth/authorize — Processa a submissão do formulário de autorização
  fastify.post('/authorize', async (request: FastifyRequest<{ Body: AuthorizeBody }>, reply: FastifyReply) => {
    const body = (request.body || {}) as AuthorizeBody;
    const clientId = body.client_id || 'spark';
    let redirectUri = body.redirect_uri || '';
    const state = body.state || '';
    const codeChallenge = body.code_challenge;
    const scope = body.scope || 'mcp:read mcp:write';

    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    if (redirectUri.includes('%3A') || redirectUri.includes('%2F')) {
      try {
        redirectUri = decodeURIComponent(redirectUri);
      } catch {}
    }

    if (!isAllowedRedirectUri(redirectUri)) {
      return reply.status(400).send({
        error: 'redirect_uri_unauthorized',
        message: 'URL de redirecionamento não autorizada.',
      });
    }

    // LGPD Art. 46 / Mitigação G2: Proibido impersonação ou emissão de token sem autenticação real
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const returnTo = `/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      return reply.redirect(`${frontendUrl}/login?returnTo=${encodeURIComponent(returnTo)}`);
    }

    // Gera o código de autorização no banco (expira em 5 minutos)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const code = crypto.randomUUID();

    await prisma.oAuthCode.create({
      data: {
        code,
        userId: user.id,
        clientId,
        redirectUri,
        codeChallenge: codeChallenge || null,
        scope,
        expiresAt,
      },
    });

    const separator = redirectUri.includes('?') ? '&' : '?';
    let targetUrl = `${redirectUri}${separator}code=${encodeURIComponent(code)}`;
    if (state) {
      targetUrl += `&state=${encodeURIComponent(state)}`;
    }

    return reply.redirect(targetUrl);
  });

  // POST /oauth/confirm — Utilizado pelo frontend SPA React (OAuthAuthorize.tsx)
  fastify.post('/confirm', async (request: FastifyRequest<{ Body: AuthorizeBody }>, reply: FastifyReply) => {
    const body = (request.body || {}) as AuthorizeBody;
    const clientId = body.client_id || 'spark';
    let redirectUri = body.redirect_uri || '';
    const state = body.state || '';
    const codeChallenge = body.code_challenge;
    const scope = body.scope || 'mcp:read mcp:write';

    if (!redirectUri) {
      return reply.status(400).send({ error: 'redirect_uri é obrigatório' });
    }

    if (redirectUri.includes('%3A') || redirectUri.includes('%2F')) {
      try {
        redirectUri = decodeURIComponent(redirectUri);
      } catch {}
    }

    if (!isAllowedRedirectUri(redirectUri)) {
      return reply.status(400).send({ error: 'URL de redirecionamento não autorizada.' });
    }

    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não autenticado.' });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const code = crypto.randomUUID();

    await prisma.oAuthCode.create({
      data: {
        code,
        userId: user.id,
        clientId,
        redirectUri,
        codeChallenge: codeChallenge || null,
        scope,
        expiresAt,
      },
    });

    const separator = redirectUri.includes('?') ? '&' : '?';
    let targetUrl = `${redirectUri}${separator}code=${encodeURIComponent(code)}`;
    if (state) {
      targetUrl += `&state=${encodeURIComponent(state)}`;
    }

    return reply.send({ redirect_url: targetUrl });
  });

  // POST /oauth/token - Troca do código de autorização pelo token de acesso com criação de McpGrant
  fastify.post('/token', async (request: FastifyRequest<{ Body: TokenBody }>, reply: FastifyReply) => {
    const body = (request.body || {}) as TokenBody;
    const code = body.code;
    const grantType = body.grant_type || 'authorization_code';
    const codeVerifier = body.code_verifier;

    if (grantType !== 'authorization_code' || !code) {
      return reply.status(400).send({
        error: 'invalid_grant',
        error_description: 'Código de autorização necessário e grant_type deve ser authorization_code.',
      });
    }

    const oauthCode = await prisma.oAuthCode.findUnique({ where: { code } });

    if (!oauthCode || oauthCode.used || oauthCode.expiresAt < new Date()) {
      return reply.status(400).send({
        error: 'invalid_grant',
        error_description: 'Código de autorização inválido ou expirado.',
      });
    }

    // Validação de PKCE (se codeChallenge estiver presente)
    if (oauthCode.codeChallenge) {
      if (!codeVerifier) {
        return reply.status(400).send({
          error: 'invalid_request',
          error_description: 'code_verifier é obrigatório quando a requisição de autorização utilizou PKCE.',
        });
      }

      const isValidVerifier = verifyCodeChallenge(codeVerifier, oauthCode.codeChallenge, 'S256');
      if (!isValidVerifier) {
        return reply.status(400).send({
          error: 'invalid_grant',
          error_description: 'code_verifier inválido para o code_challenge associado.',
        });
      }
    }

    // Invalida o código para evitar reutilização (RFC 6749)
    await prisma.oAuthCode.update({
      where: { code },
      data: { used: true },
    });

    // Cria a concessão explícita no banco (LGPD Art. 8º §5 / Art. 18 IX)
    const mcpGrant = await prisma.mcpGrant.create({
      data: {
        userId: oauthCode.userId,
        clientId: oauthCode.clientId,
        scope: oauthCode.scope,
      },
    });

    // Emite o token assinado e vinculado ao Grant
    const accessToken = signMcpToken(oauthCode.userId, mcpGrant.id, mcpGrant.scope);

    return reply.send({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60, // 30 dias em segundos
      scope: mcpGrant.scope,
    });
  });

  // GET /oauth/userinfo - Endpoint UserInfo OpenID Connect
  fastify.get('/userinfo', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveAuthenticatedUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
    return reply.send({ sub: user.id });
  });
};
