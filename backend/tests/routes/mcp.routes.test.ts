import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { mcpRoutes } from '../../src/routes/mcp.routes.js';
import { oauthRoutes } from '../../src/routes/oauth.routes.js';

describe('Integration: MCP & OAuth Metadata Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(mcpRoutes, { prefix: '/mcp' });
    await fastify.register(oauthRoutes, { prefix: '/oauth' });
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
});


