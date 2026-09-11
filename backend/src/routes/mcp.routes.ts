import { FastifyPluginAsync } from 'fastify';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createMcpServer } from '../mcp/mcp-server.js';
import crypto from 'node:crypto';

// Mapa para armazenar os transportes ativos e dados de sessão
const transports = new Map<string, { transport: SSEServerTransport; userId: string }>();

export const mcpRoutes: FastifyPluginAsync = async (fastify) => {
  // Informações básicas da raiz do MCP (responder ping/health)
  fastify.get('/', async (request, reply) => {
    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host || 'akasha-backend.onrender.com';
    const baseUrl = `${protocol}://${host}`;
    return reply.send({
      status: 'ok',
      name: 'Akasha MCP Server',
      sse_endpoint: `${baseUrl}/mcp/sse`,
    });
  });

  // GET /mcp/sse — Permite o handshake inicial de conexão SSE do protocolo MCP
  fastify.get('/sse', async (request, reply) => {
    const sessionId = crypto.randomUUID();
    let token = (request.query as any)?.token || (request.query as any)?.access_token;

    if (!token && request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.split(' ')[1];
    }

    let userId = 'guest';
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as { sub: string };
        userId = decoded.sub;
      } catch (err) {
        userId = 'guest';
      }
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const messageEndpoint = token 
      ? `/mcp/message?sessionId=${sessionId}&token=${token}`
      : `/mcp/message?sessionId=${sessionId}`;
      
    const transport = new SSEServerTransport(messageEndpoint, reply.raw);
    
    transports.set(sessionId, { transport, userId });

    const server = createMcpServer(userId);
    await server.connect(transport);

    request.raw.on('close', () => {
      transports.delete(sessionId);
      server.close();
    });

    reply.hijack();
  });

  // POST /mcp/message — Recebe as mensagens JSON-RPC do MCP
  fastify.post('/message', async (request, reply) => {
    const sessionId = (request.query as { sessionId?: string }).sessionId;

    if (!sessionId) {
      reply.status(400).send({ error: 'sessionId é obrigatório' });
      return;
    }

    const sessionData = transports.get(sessionId);
    if (!sessionData) {
      reply.status(404).send({ error: 'Sessão MCP não encontrada' });
      return;
    }

    await sessionData.transport.handlePostMessage(request.raw, reply.raw);
  });
};

