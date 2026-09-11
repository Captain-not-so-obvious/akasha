import { FastifyPluginAsync } from 'fastify';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createMcpServer } from '../mcp/mcp-server.js';
import crypto from 'node:crypto';

// Mapa para armazenar os transportes ativos
const transports = new Map<string, SSEServerTransport>();

export const mcpRoutes: FastifyPluginAsync = async (fastify) => {
  // Ambas as rotas exigem que o usuário esteja autenticado via token JWT (Supabase)
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/sse', async (request, reply) => {
    const sessionId = crypto.randomUUID();
    
    // O SDK lida diretamente com a Response (raw) do Node.js
    // No Fastify, podemos acessar request.raw e reply.raw
    
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Endpoint onde o cliente MCP enviará as mensagens POST
    const messageEndpoint = `/mcp/message?sessionId=${sessionId}`;
    const transport = new SSEServerTransport(messageEndpoint, reply.raw);
    
    transports.set(sessionId, transport);

    // Cria o servidor MCP exclusivo para este usuário e o conecta
    const server = createMcpServer(request.userId);
    
    // Conecta o servidor ao transporte
    await server.connect(transport);

    // Limpa a conexão se o cliente fechar
    request.raw.on('close', () => {
      transports.delete(sessionId);
      server.close();
    });
  });

  fastify.post('/message', async (request, reply) => {
    const sessionId = (request.query as { sessionId?: string }).sessionId;

    if (!sessionId) {
      reply.status(400).send({ error: 'sessionId é obrigatório' });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      reply.status(404).send({ error: 'Sessão MCP não encontrada' });
      return;
    }

    // Passa a mensagem para o transporte
    await transport.handlePostMessage(request.raw, reply.raw);
  });
};
