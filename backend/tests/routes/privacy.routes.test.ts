import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { privacyRoutes } from '../../src/routes/privacy.routes.js';
import { prisma } from '../../src/lib/prisma.js';

// Mock do authMiddleware
vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  verifySupabaseAuth: async (request: any) => {
    request.userId = '11111111-2222-3333-4444-555555555555';
  },
  authMiddleware: async (request: any) => {
    request.userId = '11111111-2222-3333-4444-555555555555';
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mcpGrant: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    consentRecord: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Integration: Privacy & LGPD Routes (/privacy)', () => {
  let fastify: ReturnType<typeof Fastify>;
  const mockUserId = '11111111-2222-3333-4444-555555555555';

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(cookie);
    await fastify.register(privacyRoutes, { prefix: '/privacy' });
    vi.clearAllMocks();
  });

  describe('GET /privacy/export', () => {
    it('deve retornar JSON consolidado de exportação e cabeçalho de download', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce({
        id: mockUserId,
        email: 'viajante@teste.com',
        username: 'viajante',
        avatarUrl: null,
        friendCode: 'AK-1234-5678',
        activityVisibility: 'friends',
        discoverableByEmail: false,
        updatedAt: new Date(),
        wishlists: [],
        activities: [],
        sentFriendships: [],
        receivedFriendships: [],
        notifications: [],
        mcpGrants: [],
        consentRecords: [],
      } as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/privacy/export',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment; filename=');
      const body = response.json();
      expect(body).toHaveProperty('exportMetadata');
      expect(body.exportMetadata.controller).toContain('Fillipe Moreira');
      expect(body.profile.id).toBe(mockUserId);
    });

    it('deve retornar 404 se perfil não for encontrado', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/privacy/export',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /privacy/account', () => {
    it('deve rejeitar se a confirmação "EXCLUIR" não for fornecida', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/privacy/account',
        payload: { confirmation: 'cancelar' },
      });

      expect(response.statusCode).toBe(400);
      expect(prisma.profile.delete).not.toHaveBeenCalled();
    });

    it('deve excluir o perfil e limpar os cookies de sessão quando a confirmação for EXCLUIR', async () => {
      vi.mocked(prisma.profile.delete).mockResolvedValueOnce({} as any);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/privacy/account',
        payload: { confirmation: 'EXCLUIR' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('success', true);
      expect(prisma.profile.delete).toHaveBeenCalledWith({ where: { id: mockUserId } });
    });
  });

  describe('GET & DELETE /privacy/connections', () => {
    it('GET /privacy/connections deve listar conexões MCP ativas', async () => {
      vi.mocked(prisma.mcpGrant.findMany).mockResolvedValueOnce([
        {
          id: '11111111-1111-1111-1111-111111111111',
          clientId: 'claude',
          scope: 'mcp:read mcp:write',
          createdAt: new Date(),
          lastUsedAt: null,
        },
      ] as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/privacy/connections',
      });

      expect(response.statusCode).toBe(200);
      const list = response.json();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(1);
      expect(list[0].clientId).toBe('claude');
    });

    it('DELETE /privacy/connections/:id deve revogar uma conexão ativa', async () => {
      const grantId = '11111111-1111-1111-1111-111111111111';
      vi.mocked(prisma.mcpGrant.findFirst).mockResolvedValueOnce({
        id: grantId,
        userId: mockUserId,
      } as any);
      vi.mocked(prisma.mcpGrant.update).mockResolvedValueOnce({} as any);

      const response = await fastify.inject({
        method: 'DELETE',
        url: `/privacy/connections/${grantId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('success', true);
      expect(prisma.mcpGrant.update).toHaveBeenCalled();
    });
  });

  describe('GET & PATCH /privacy/settings', () => {
    it('GET /privacy/settings deve retornar configurações atuais', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce({
        activityVisibility: 'friends',
        discoverableByEmail: false,
      } as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/privacy/settings',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        activityVisibility: 'friends',
        discoverableByEmail: false,
      });
    });

    it('PATCH /privacy/settings deve atualizar configurações com sucesso', async () => {
      vi.mocked(prisma.profile.update).mockResolvedValueOnce({
        activityVisibility: 'private',
        discoverableByEmail: true,
      } as any);

      const response = await fastify.inject({
        method: 'PATCH',
        url: '/privacy/settings',
        payload: {
          activityVisibility: 'private',
          discoverableByEmail: true,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().settings).toEqual({
        activityVisibility: 'private',
        discoverableByEmail: true,
      });
    });
  });

  describe('GET & POST /privacy/consent', () => {
    it('GET /privacy/consent deve listar termos ou políticas pendentes', async () => {
      vi.mocked(prisma.consentRecord.findFirst).mockResolvedValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/privacy/consent',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().pending).toContain('terms');
      expect(response.json().pending).toContain('privacy');
    });

    it('POST /privacy/consent deve registrar aceite formal', async () => {
      vi.mocked(prisma.consentRecord.create).mockResolvedValueOnce({
        id: 1,
        userId: mockUserId,
        document: 'privacy',
        version: '2026-10-09',
        acceptedAt: new Date(),
      } as any);

      const response = await fastify.inject({
        method: 'POST',
        url: '/privacy/consent',
        payload: {
          document: 'privacy',
          version: '2026-10-09',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveProperty('consentId', 1);
    });
  });
});
