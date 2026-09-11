import { FastifyPluginAsync } from 'fastify';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer, AKASHA_MCP_TOOLS, executeAkashaMcpTool } from '../mcp/mcp-server.js';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

// Mapa para armazenar os transportes ativos e dados de sessão SSE
const transports = new Map<string, { transport: SSEServerTransport; userId: string }>();

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'akasha-mcp-jwt-secret-2026-v1';

// Helper para autenticar o token Bearer ou query param
async function authenticateMcpUser(request: any): Promise<string | null> {
  let token = (request.query as any)?.token || (request.query as any)?.access_token;

  if (!token && request.headers.authorization?.startsWith('Bearer ')) {
    token = request.headers.authorization.split(' ')[1].trim();
  }

  if (!token) return null;

  // 1. Tenta verificar via JWT usando JWT_SECRET
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    if (decoded?.sub) return decoded.sub;
  } catch {}

  // 2. Tenta decodificar se for token do tipo oauth_mcp emitido pelo Akasha
  try {
    const decoded = jwt.decode(token) as { sub: string; type?: string };
    if (decoded?.sub && decoded?.type === 'oauth_mcp') {
      const profile = await prisma.profile.findUnique({ where: { id: decoded.sub } });
      if (profile) return profile.id;
    }
  } catch {}

  // 3. Fallback: Tenta autenticar na API do Supabase Auth
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
      });

      if (res.ok) {
        const user = await res.json();
        if (user?.id) return user.id;
      }
    } catch {}
  }

  return null;
}

export const mcpRoutes: FastifyPluginAsync = async (fastify) => {
  
  // GET /mcp — Retorna status e metadados básicos do servidor MCP
  fastify.get('/', async (request, reply) => {
    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host || 'akasha-backend.onrender.com';
    const baseUrl = `${protocol}://${host}`;
    return reply.send({
      status: 'online',
      name: 'Akasha MCP Server',
      version: '1.0.0',
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      sse_endpoint: `${baseUrl}/mcp/sse`,
    });
  });

  // POST /mcp — Endpoint HTTP JSON-RPC 2.0 direto (Arquitetura SmartBolsa / Google Spark)
  fastify.post('/', async (request, reply) => {
    const body = request.body as any;

    if (!body || typeof body !== 'object') {
      return reply.status(400).send({
        error: { code: -32700, message: 'Parse error / JSON inválido' }
      });
    }

    const method = body.method;
    const params = body.params || {};
    const reqId = body.id;

    // 1. Handshake / Initialize (pode ocorrer antes da autenticação)
    if (method === 'initialize') {
      return reply.send({
        jsonrpc: '2.0',
        id: reqId,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'Akasha MCP Server',
            version: '1.0.0'
          }
        }
      });
    }

    if (method === 'notifications/initialized' || method === 'ping') {
      return reply.send({ jsonrpc: '2.0', id: reqId, result: {} });
    }

    // 2. Autenticação estrita para listar e chamar ferramentas
    const userId = await authenticateMcpUser(request);
    if (!userId) {
      const protocol = request.headers['x-forwarded-proto'] || request.protocol;
      const host = request.headers.host || 'akasha-backend.onrender.com';
      const baseUrl = `${protocol}://${host}`;

      reply.header(
        'WWW-Authenticate',
        `Bearer realm="akasha", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      );

      return reply.status(401).send({
        jsonrpc: '2.0',
        id: reqId,
        error: {
          code: -32001,
          message: 'Não autorizado. Forneça um token válido no cabeçalho Authorization: Bearer <token>'
        }
      });
    }


    // 3. Listar Ferramentas
    if (method === 'tools/list' || method === 'tools/list_tools') {
      return reply.send({
        jsonrpc: '2.0',
        id: reqId,
        result: {
          tools: AKASHA_MCP_TOOLS
        }
      });
    }

    // 4. Executar Ferramenta
    if (method === 'tools/call' || method === 'tools/execute') {
      const toolName = params.name;
      const args = params.arguments || {};

      try {
        const result = await executeAkashaMcpTool(toolName, args, userId);
        return reply.send({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
              }
            ]
          }
        });
      } catch (err: any) {
        return reply.send({
          jsonrpc: '2.0',
          id: reqId,
          error: {
            code: -32603,
            message: `Erro interno ao executar ferramenta: ${err.message}`
          }
        });
      }
    }

    return reply.status(400).send({
      jsonrpc: '2.0',
      id: reqId,
      error: {
        code: -32601,
        message: `Método '${method}' desconhecido.`
      }
    });
  });

  // GET /mcp/sse — Permite o handshake inicial de conexão SSE do protocolo MCP
  fastify.get('/sse', async (request, reply) => {
    const userId = (await authenticateMcpUser(request)) || 'guest';


    reply.hijack();
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host || 'akasha-backend.onrender.com';
    const baseUrl = `${protocol}://${host}`;

    const token = (request.query as any)?.token || (request.query as any)?.access_token;
    const messageEndpoint = token 
      ? `${baseUrl}/mcp/message?token=${token}`
      : `${baseUrl}/mcp/message`;
      
    const transport = new SSEServerTransport(messageEndpoint, reply.raw);
    
    transports.set(transport.sessionId, { transport, userId });

    const server = createMcpServer(userId);
    await server.connect(transport);

    request.raw.on('close', () => {
      transports.delete(transport.sessionId);
      server.close();
    });
  });

  // POST /mcp/message — Recebe as mensagens JSON-RPC do MCP para sessões SSE
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

    await sessionData.transport.handlePostMessage(request.raw, reply.raw, request.body);
    reply.hijack();
  });
};



