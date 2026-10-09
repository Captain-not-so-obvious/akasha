import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signMcpToken, verifyMcpToken, getMcpSecret } from '../../src/lib/mcpToken.js';
import { prisma } from '../../src/lib/prisma.js';
import jwt from 'jsonwebtoken';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    mcpGrant: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe('mcpToken Security & Delegation', () => {
  const userId = '11111111-2222-3333-4444-555555555555';
  const grantId = 'grant-uuid-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve assinar e validar um token MCP válido com grant ativo', async () => {
    vi.mocked(prisma.mcpGrant.findFirst).mockResolvedValueOnce({ id: grantId } as any);

    const token = signMcpToken(userId, grantId);
    expect(token).toBeDefined();

    const verifiedUserId = await verifyMcpToken(token);
    expect(verifiedUserId).toBe(userId);
    expect(prisma.mcpGrant.findFirst).toHaveBeenCalledWith({
      where: {
        id: grantId,
        userId,
        revokedAt: null,
      },
      select: { id: true },
    });
  });

  it('deve rejeitar um token forjado sem assinatura válida ou com segredo errado', async () => {
    const forgedToken = jwt.sign(
      { sub: userId, jti: grantId, type: 'oauth_mcp' },
      'wrong-secret-that-does-not-match-at-all-12345'
    );

    const verifiedUserId = await verifyMcpToken(forgedToken);
    expect(verifiedUserId).toBeNull();
    expect(prisma.mcpGrant.findFirst).not.toHaveBeenCalled();
  });

  it('deve rejeitar se o grant estiver revogado no banco', async () => {
    vi.mocked(prisma.mcpGrant.findFirst).mockResolvedValueOnce(null);

    const token = signMcpToken(userId, grantId);
    const verifiedUserId = await verifyMcpToken(token);

    expect(verifiedUserId).toBeNull();
  });

  it('deve rejeitar token expirado', async () => {
    const secret = getMcpSecret();
    const expiredToken = jwt.sign(
      { sub: userId, jti: grantId, type: 'oauth_mcp' },
      secret,
      {
        issuer: 'akasha',
        audience: 'akasha-mcp',
        expiresIn: '-1s',
      }
    );

    const verifiedUserId = await verifyMcpToken(expiredToken);
    expect(verifiedUserId).toBeNull();
  });

  it('deve rejeitar token com issuer ou audience inválido', async () => {
    const secret = getMcpSecret();
    const badAudienceToken = jwt.sign(
      { sub: userId, jti: grantId, type: 'oauth_mcp' },
      secret,
      {
        issuer: 'malicious',
        audience: 'wrong-audience',
        expiresIn: '1h',
      }
    );

    const verifiedUserId = await verifyMcpToken(badAudienceToken);
    expect(verifiedUserId).toBeNull();
  });
});
