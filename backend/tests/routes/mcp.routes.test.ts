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
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('name', 'Akasha MCP Server');
    expect(body.sse_endpoint).toContain('/mcp/sse');
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
});
