import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

const MCP_ISSUER = 'akasha';
const MCP_AUDIENCE = 'akasha-mcp';

export function getMcpSecret(): string {
  const secret = process.env.MCP_JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Segurança Crítica: MCP_JWT_SECRET (ou SUPABASE_JWT_SECRET) ausente ou inseguro em produção (mínimo de 32 caracteres obrigatório).'
      );
    }
    // Chave temporária segura estritamente para testes locais em desenvolvimento
    return 'akasha-mcp-jwt-secret-dev-2026-min-32-chars-long';
  }
  return secret.trim();
}

export interface McpTokenPayload {
  sub: string;
  jti: string;
  scope: string;
  type: 'oauth_mcp';
  iss?: string;
  aud?: string;
}

/**
 * Emite um token de acesso MCP assinado digitalmente e atrelado a um McpGrant no banco.
 */
export function signMcpToken(userId: string, grantId: string, scope = 'mcp:read mcp:write'): string {
  return jwt.sign(
    {
      scope,
      type: 'oauth_mcp',
    },
    getMcpSecret(),
    {
      subject: userId,
      jwtid: grantId,
      issuer: MCP_ISSUER,
      audience: MCP_AUDIENCE,
      expiresIn: '30d',
      algorithm: 'HS256',
    }
  );
}

/**
 * Valida o token MCP:
 * 1. Verifica criptograficamente a assinatura e o tempo de expiração
 * 2. Verifica se a concessão (McpGrant) ainda existe e NÃO foi revogada no banco
 * 3. Atualiza lastUsedAt de forma assíncrona
 * Retorna o userId autenticado ou null se inválido/revogado.
 */
export async function verifyMcpToken(token: string): Promise<string | null> {
  if (!token || typeof token !== 'string') return null;

  try {
    const payload = jwt.verify(token, getMcpSecret(), {
      issuer: MCP_ISSUER,
      audience: MCP_AUDIENCE,
      algorithms: ['HS256'],
    }) as unknown as McpTokenPayload;

    if (!payload.sub || !payload.jti || payload.type !== 'oauth_mcp') {
      return null;
    }

    // Consulta no banco se o grant existe e não foi revogado
    const grant = await prisma.mcpGrant.findFirst({
      where: {
        id: payload.jti,
        userId: payload.sub,
        revokedAt: null,
      },
      select: { id: true },
    });

    if (!grant) {
      return null;
    }

    // Atualiza timestamp de uso em background
    prisma.mcpGrant
      .update({
        where: { id: grant.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return payload.sub;
  } catch {
    return null;
  }
}
