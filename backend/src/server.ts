import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { wishlistRoutes } from './routes/wishlist.routes.js';
import { tmdbRoutes } from './routes/tmdb.routes.js';
import { recommendationRoutes } from './routes/recommendation.routes.js';
import { mcpRoutes } from './routes/mcp.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { oauthRoutes } from './routes/oauth.routes.js';
import { friendsRoutes } from './routes/friends.routes.js';
import { profileRoutes } from './routes/profile.routes.js';
import { feedRoutes } from './routes/feed.routes.js';
import cookie from '@fastify/cookie';

const fastify = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// Registrar parser para application/x-www-form-urlencoded (padrão de requisições OAuth)
fastify.addContentTypeParser(
  'application/x-www-form-urlencoded',
  { parseAs: 'string' },
  (req, body, done) => {
    try {
      const parsed = Object.fromEntries(new URLSearchParams(body as string));
      done(null, parsed);
    } catch (err: any) {
      done(err, undefined);
    }
  }
);

// Registrar plugin de cookie
await fastify.register(cookie);

// CORS: Permite origin dinâmico para integrações MCP (Gemini, Claude, web app local, etc.)
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Mcp-Version', 'Mcp-Session-Id', 'Last-Event-ID'],
  credentials: true,
});

// Registro de rotas com prefixo
await fastify.register(oauthRoutes, { prefix: '/oauth' });
await fastify.register(authRoutes, { prefix: '/auth' });
await fastify.register(wishlistRoutes, { prefix: '/wishlist' });
await fastify.register(tmdbRoutes, { prefix: '/tmdb' });
await fastify.register(recommendationRoutes, { prefix: '/recommendations' });
await fastify.register(mcpRoutes, { prefix: '/mcp' });
await fastify.register(friendsRoutes, { prefix: '/friends' });
await fastify.register(profileRoutes, { prefix: '/profile' });
await fastify.register(feedRoutes, { prefix: '/feed' });

// Helper para obter a URL base dinâmica
const getBaseUrl = (request: FastifyRequest) => {
  const protocol = request.headers['x-forwarded-proto'] || request.protocol;
  const host = request.headers.host || 'akasha-backend.onrender.com';
  return `${protocol}://${host}`;
};

const sendAuthServerMetadata = async (request: FastifyRequest, reply: FastifyReply) => {
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
};

const sendProtectedResourceMetadata = async (request: FastifyRequest, reply: FastifyReply) => {
  const baseUrl = getBaseUrl(request);
  return reply.send({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
    scopes_supported: ['mcp:read', 'mcp:write'],
  });
};

const sendMcpMetadata = async (request: FastifyRequest, reply: FastifyReply) => {
  const baseUrl = getBaseUrl(request);
  return reply.send({
    name: 'Akasha MCP Server',
    version: '1.0.0',
    description: 'Servidor MCP de entretenimento inteligente do Akasha',
    endpoints: {
      sse: `${baseUrl}/mcp/sse`,
      messages: `${baseUrl}/mcp/message`,
    },
    authentication: {
      type: 'oauth2',
      authorization_server: baseUrl,
    },
  });
};

// Endpoints de Descoberta OAuth 2.0 & OpenID Connect (RFC 8414, RFC 9728 & OIDC)
const authDiscoveryPaths = [
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-authorization-server/*',
  '/.well-known/openid-configuration',
  '/.well-known/openid-configuration/*',
  '/mcp/.well-known/oauth-authorization-server',
  '/mcp/.well-known/oauth-authorization-server/*',
  '/mcp/.well-known/openid-configuration',
  '/mcp/.well-known/openid-configuration/*',
  '/mcp/sse/.well-known/oauth-authorization-server',
  '/mcp/sse/.well-known/oauth-authorization-server/*',
  '/mcp/sse/.well-known/openid-configuration',
  '/mcp/sse/.well-known/openid-configuration/*',
];

for (const path of authDiscoveryPaths) {
  fastify.get(path, sendAuthServerMetadata);
}

const protectedResourcePaths = [
  '/.well-known/oauth-protected-resource',
  '/.well-known/oauth-protected-resource/*',
  '/mcp/.well-known/oauth-protected-resource',
  '/mcp/.well-known/oauth-protected-resource/*',
  '/mcp/sse/.well-known/oauth-protected-resource',
  '/mcp/sse/.well-known/oauth-protected-resource/*',
];

for (const path of protectedResourcePaths) {
  fastify.get(path, sendProtectedResourceMetadata);
}

const mcpMetadataPaths = [
  '/.well-known/mcp',
  '/.well-known/mcp.json',
  '/mcp/.well-known/mcp',
  '/mcp/.well-known/mcp.json',
  '/mcp/sse/.well-known/mcp',
  '/mcp/sse/.well-known/mcp.json',
  '/',
];

for (const path of mcpMetadataPaths) {
  fastify.get(path, sendMcpMetadata);
}

// Health check — usado pelo Render para verificar se o servidor está vivo
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

const PORT = Number(process.env.PORT) || 3000;

try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

