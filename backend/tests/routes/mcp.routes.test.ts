import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { mcpRoutes } from '../../src/routes/mcp.routes.js';
import { oauthRoutes } from '../../src/routes/oauth.routes.js';
import { prisma } from '../../src/lib/prisma.js';

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
    wishlist: {
      upsert: vi.fn(),
      delete: vi.fn(),
    }
  },
}));

describe('Integration: MCP & OAuth Metadata Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
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

  it('POST /oauth/authorize - deve processar autorização com sucesso quando houver correspondência exata de e-mail/usuário', async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue({
      id: '11111111-2222-3333-4444-555555555555',
      username: 'usuario.teste@example.com',
      avatarUrl: null,
      updatedAt: new Date()
    } as any);
    vi.mocked(prisma.profile.upsert).mockResolvedValue({} as any);
    vi.mocked(prisma.oAuthCode.create).mockResolvedValue({} as any);

    const response = await fastify.inject({
      method: 'POST',
      url: '/oauth/authorize',
      payload: {
        client_id: 'spark',
        redirect_uri: 'https://spark.google.com/oauth/callback',
        state: 'test-state-123',
        username: 'usuario.teste@example.com'
      }
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('code=');
    expect(prisma.profile.create).not.toHaveBeenCalled();
  });

  it('POST /oauth/authorize - deve retornar mensagem de erro sem criar perfil fictício quando usuário não for encontrado', async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue(null);

    const response = await fastify.inject({
      method: 'POST',
      url: '/oauth/authorize',
      payload: {
        client_id: 'spark',
        redirect_uri: 'https://spark.google.com/oauth/callback',
        state: 'test-state-123',
        username: 'naoexistente@example.com'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('E-mail ou usuário não encontrado');
    expect(prisma.profile.create).not.toHaveBeenCalled();
  });
});


