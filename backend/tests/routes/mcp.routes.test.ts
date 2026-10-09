import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { mcpRoutes } from '../../src/routes/mcp.routes.js';
import { oauthRoutes } from '../../src/routes/oauth.routes.js';
import { prisma } from '../../src/lib/prisma.js';
import jwt from 'jsonwebtoken';
import { signMcpToken } from '../../src/lib/mcpToken.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    profile: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    oAuthCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    mcpGrant: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    wishlist: {
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('Integration: MCP & OAuth Security & Privacy Routes', () => {
  let fastify: ReturnType<typeof Fastify>;
  const mockUserId = '11111111-2222-3333-4444-555555555555';
  const mockGrantId = 'grant-uuid-999';

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(cookie);
    await fastify.register(mcpRoutes, { prefix: '/mcp' });
    await fastify.register(oauthRoutes, { prefix: '/oauth' });
    vi.clearAllMocks();
  });

  it('GET /mcp - deve retornar informações básicas do servidor MCP', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/mcp',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('status', 'online');
    expect(body).toHaveProperty('name', 'Akasha MCP Server');
    expect(body.sse_endpoint).toContain('/mcp/sse');
  });

  it('POST /mcp (initialize) - deve retornar resultado no formato JSON-RPC 2.0', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/mcp',
      payload: { jsonrpc: '2.0', id: 1, method: 'initialize' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(1);
    expect(body.result.serverInfo.name).toBe('Akasha MCP Server');
  });

  it('GET /oauth/metadata - deve retornar metadados RFC 8414 suportando PKCE', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/oauth/metadata',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('authorization_endpoint');
    expect(body).toHaveProperty('token_endpoint');
    expect(body.code_challenge_methods_supported).toEqual(['S256', 'plain']);
  });

  it('POST /mcp/message - deve retornar 404 para sessionId inexistente', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/mcp/message?sessionId=invalid-session',
      payload: { jsonrpc: '2.0', id: 1, method: 'ping' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Sessão MCP não encontrada' });
  });

  it('POST /mcp (tools/list) - deve retornar 401 se não houver autenticação válida', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/mcp',
      payload: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers['www-authenticate']).toBeDefined();
  });

  it('POST /mcp (tools/list) - deve retornar lista de tools quando autenticado com token MCP válido', async () => {
    vi.mocked(prisma.mcpGrant.findFirst).mockResolvedValueOnce({
      id: mockGrantId,
      userId: mockUserId,
      revokedAt: null,
    } as any);

    const validToken = signMcpToken(mockUserId, mockGrantId);

    const response = await fastify.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
      payload: { jsonrpc: '2.0', id: 3, method: 'tools/list' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result).toHaveProperty('tools');
    expect(Array.isArray(body.result.tools)).toBe(true);
  });

  it('POST /oauth/authorize - deve redirecionar para login caso usuário não esteja autenticado', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/oauth/authorize',
      payload: {
        client_id: 'claude',
        redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
        state: 'test-state-123',
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('/login?returnTo=');
    expect(prisma.oAuthCode.create).not.toHaveBeenCalled();
  });

  it('POST /oauth/authorize - deve rejeitar redirect_uri não autorizado com HTTP 400', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/oauth/authorize',
      payload: {
        client_id: 'malicious-client',
        redirect_uri: 'https://attacker.com/oauth/callback',
        state: 'test-state-123',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty('error', 'redirect_uri_unauthorized');
  });

  it('POST /oauth/token - deve trocar código válido por token e registrar McpGrant', async () => {
    const fakeCode = 'code-12345';
    vi.mocked(prisma.oAuthCode.findUnique).mockResolvedValueOnce({
      code: fakeCode,
      userId: mockUserId,
      clientId: 'claude',
      redirectUri: 'https://claude.ai/api/mcp/auth_callback',
      codeChallenge: null,
      scope: 'mcp:read mcp:write',
      expiresAt: new Date(Date.now() + 100000),
      used: false,
    } as any);

    vi.mocked(prisma.oAuthCode.update).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.mcpGrant.create).mockResolvedValueOnce({
      id: mockGrantId,
      userId: mockUserId,
      clientId: 'claude',
      scope: 'mcp:read mcp:write',
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
    } as any);

    const response = await fastify.inject({
      method: 'POST',
      url: '/oauth/token',
      payload: {
        grant_type: 'authorization_code',
        code: fakeCode,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('token_type', 'Bearer');
    expect(body).toHaveProperty('expires_in', 2592000);
    expect(prisma.mcpGrant.create).toHaveBeenCalledWith({
      data: {
        userId: mockUserId,
        clientId: 'claude',
        scope: 'mcp:read mcp:write',
      },
    });
  });
});
