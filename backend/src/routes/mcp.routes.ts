import { FastifyPluginAsync } from 'fastify';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from '../mcp/mcp-server.js';
import jwt from 'jsonwebtoken';

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

    // Assumir o controle manual da resposta no Fastify
    reply.hijack();
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host || 'akasha-backend.onrender.com';
    const baseUrl = `${protocol}://${host}`;

    const messageEndpoint = token 
      ? `${baseUrl}/mcp/message?token=${token}`
      : `${baseUrl}/mcp/message`;
      
    const transport = new SSEServerTransport(messageEndpoint, reply.raw);
    
    // O SSEServerTransport gera seu próprio transport.sessionId no construtor.
    // É esse ID que o cliente recebe no evento SSE 'endpoint', portanto devemos usá-lo no Map!
    transports.set(transport.sessionId, { transport, userId });

    const server = createMcpServer(userId);
    await server.connect(transport);

    request.raw.on('close', () => {
      transports.delete(transport.sessionId);
      server.close();
    });
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

    // Passar request.body como 3º parâmetro pois o Fastify já consumiu o stream request.raw
    await sessionData.transport.handlePostMessage(request.raw, reply.raw, request.body);
    reply.hijack();
  });
};


