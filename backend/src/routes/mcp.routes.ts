import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer, AKASHA_MCP_TOOLS, executeAkashaMcpTool } from '../mcp/mcp-server.js';
import jwt from 'jsonwebtoken';
import { verifyMcpToken } from '../lib/mcpToken.js';

// Mapa para armazenar os transportes ativos e dados de sessão SSE
const transports = new Map<string, { transport: SSEServerTransport; userId: string }>();

interface McpQuery {
  token?: string;
  access_token?: string;
  sessionId?: string;
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

/**
 * Autentica o usuário de forma criptograficamente segura:
 * 1. Tenta validar como token MCP assinado (McpGrant ativo)
 * 2. Fallback: Tenta validar como Supabase JWT emitido para a aplicação
 * 3. Fallback: Consulta remota ao Supabase Auth
 * NUNCA aceita tokens sem validação de assinatura (LGPD Art. 46).
 */
export async function authenticateMcpUser(request: FastifyRequest): Promise<string | null> {
  const query = request.query as McpQuery | undefined;
  let token = query?.token?.trim() || query?.access_token?.trim();

  if (!token && request.headers.authorization?.startsWith('Bearer ')) {
    token = request.headers.authorization.split(' ')[1]?.trim();
  }

  if (!token) return null;

  // 1. Validar como token MCP criptograficamente assinado com McpGrant ativo
  const mcpUserId = await verifyMcpToken(token);
  if (mcpUserId) {
    return mcpUserId;
  }

  // 2. Validar token de sessão do Supabase (quando chamado diretamente pelo frontend)
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (supabaseJwtSecret) {
    try {
      const decoded = jwt.verify(token, supabaseJwtSecret) as { sub?: string };
      if (decoded?.sub) return decoded.sub;
    } catch {
      // Continua para o fallback do Supabase Auth
    }
  }

  // 3. Fallback remoto ao Supabase Auth
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
        const user = (await res.json()) as { id?: string };
        if (user?.id) return user.id;
      }
    } catch {
      // Ignora falha de rede e rejeita
    }
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
        tools: {},
      },
      sse_endpoint: `${baseUrl}/mcp/sse`,
    });
  });

  // POST /mcp — Endpoint HTTP JSON-RPC 2.0 direto
  fastify.post('/', async (request, reply) => {
    const body = request.body as JsonRpcRequest | undefined;

    if (!body || typeof body !== 'object') {
      return reply.status(400).send({
        error: { code: -32700, message: 'Parse error / JSON inválido' },
      });
    }

    const method = body.method;
    const params = body.params || {};
    const reqId = body.id ?? null;

    // 1. Handshake / Initialize (RFC MCP)
    if (method === 'initialize') {
      return reply.send({
        jsonrpc: '2.0',
        id: reqId,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'Akasha MCP Server',
            version: '1.0.0',
          },
        },
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
          message: 'Não autorizado. Forneça um token válido no cabeçalho Authorization: Bearer <token>',
        },
      });
    }

    // 3. Listar Ferramentas
    if (method === 'tools/list' || method === 'tools/list_tools') {
      return reply.send({
        jsonrpc: '2.0',
        id: reqId,
        result: {
          tools: AKASHA_MCP_TOOLS,
        },
      });
    }

    // 4. Executar Ferramenta
    if (method === 'tools/call' || method === 'tools/execute') {
      const toolName = params.name;
      const args = params.arguments || {};

      if (!toolName) {
        return reply.status(400).send({
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32602, message: 'Parâmetro params.name é obrigatório.' },
        });
      }

      try {
        const result = await executeAkashaMcpTool(toolName, args, userId);
        return reply.send({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [
              {
                type: 'text',
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
              },
            ],
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        return reply.send({
          jsonrpc: '2.0',
          id: reqId,
          error: {
            code: -32603,
            message: `Erro interno ao executar ferramenta: ${message}`,
          },
        });
      }
    }

    return reply.status(400).send({
      jsonrpc: '2.0',
      id: reqId,
      error: {
        code: -32601,
        message: `Método '${method}' desconhecido.`,
      },
    });
  });

  // GET /mcp/sse — Handshake de conexão SSE
  fastify.get('/sse', async (request, reply) => {
    const userId = await authenticateMcpUser(request);

    // LGPD Art. 46: Proibido conectar como 'guest' e expor dados ou criar sessões fantasmas
    if (!userId) {
      const protocol = request.headers['x-forwarded-proto'] || request.protocol;
      const host = request.headers.host || 'akasha-backend.onrender.com';
      const baseUrl = `${protocol}://${host}`;

      reply.header(
        'WWW-Authenticate',
        `Bearer realm="akasha", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
      );

      return reply.status(401).send({ error: 'Token de autenticação ausente ou inválido para conexão SSE.' });
    }

    reply.hijack();

    const protocol = request.headers['x-forwarded-proto'] || request.protocol;
    const host = request.headers.host || 'akasha-backend.onrender.com';
    const baseUrl = `${protocol}://${host}`;

    const query = request.query as McpQuery | undefined;
    const token = query?.token?.trim() || query?.access_token?.trim();
    const messageEndpoint = token
      ? `${baseUrl}/mcp/message?token=${encodeURIComponent(token)}`
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
    const query = request.query as McpQuery | undefined;
    const sessionId = query?.sessionId?.trim();

    if (!sessionId) {
      return reply.status(400).send({ error: 'sessionId é obrigatório' });
    }

    const sessionData = transports.get(sessionId);
    if (!sessionData) {
      return reply.status(404).send({ error: 'Sessão MCP não encontrada' });
    }

    await sessionData.transport.handlePostMessage(request.raw, reply.raw, request.body);
    reply.hijack();
  });
};
