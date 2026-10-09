import { describe, it, expect, vi, beforeEach } from 'vitest';
import { purgeExpiredData } from '../../src/services/retention.service.js';
import { prisma } from '../../src/lib/prisma.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    oAuthCode: {
      deleteMany: vi.fn(),
    },
    notification: {
      deleteMany: vi.fn(),
    },
    mcpGrant: {
      deleteMany: vi.fn(),
    },
  },
}));

describe('Retention Service (LGPD Art. 15 e 16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve expurgar códigos OAuth, notificações lidas antigas e concessões revogadas', async () => {
    vi.mocked(prisma.oAuthCode.deleteMany).mockResolvedValueOnce({ count: 5 });
    vi.mocked(prisma.notification.deleteMany).mockResolvedValueOnce({ count: 12 });
    vi.mocked(prisma.mcpGrant.deleteMany).mockResolvedValueOnce({ count: 2 });

    const result = await purgeExpiredData();

    expect(result).toEqual({
      purgedOAuthCodes: 5,
      purgedNotifications: 12,
      purgedMcpGrants: 2,
    });

    expect(prisma.oAuthCode.deleteMany).toHaveBeenCalled();
    expect(prisma.notification.deleteMany).toHaveBeenCalled();
    expect(prisma.mcpGrant.deleteMany).toHaveBeenCalled();
  });
});
