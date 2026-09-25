import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { friendsRoutes } from '../../src/routes/friends.routes.js';
import { prisma } from '../../src/lib/prisma.js';
import * as comparisonService from '../../src/services/comparison.service.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    profile: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    friendship: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    wishlist: {
      findMany: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/comparison.service.js', () => ({
  compareUserLibraries: vi.fn(),
}));

vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  verifySupabaseAuth: vi.fn(async (request) => {
    request.userId = '00000000-0000-0000-0000-000000000001';
  }),
}));

describe('Integração: Rota GET /friends/:id/compare (SPEC-006)', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(friendsRoutes, { prefix: '/friends' });
    vi.clearAllMocks();
  });

  it('deve retornar 400 se o ID do amigo não for um UUID válido', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/friends/id-invalido/compare',
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('ID de amigo inválido.');
  });

  it('deve retornar 400 se o usuário tentar comparar o acervo consigo mesmo', async () => {
    const res = await fastify.inject({
      method: 'GET',
      url: '/friends/00000000-0000-0000-0000-000000000001/compare',
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Não é possível comparar seu acervo consigo mesmo.');
  });

  it('deve retornar 403 se os usuários não forem amigos confirmados', async () => {
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);

    const res = await fastify.inject({
      method: 'GET',
      url: '/friends/00000000-0000-0000-0000-000000000002/compare',
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('Você só pode comparar acervos com viajantes que sejam seus amigos confirmados.');
  });

  it('deve retornar 403 se a solicitação ainda estiver pendente', async () => {
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({
      id: 10,
      requesterId: '00000000-0000-0000-0000-000000000001',
      addresseeId: '00000000-0000-0000-0000-000000000002',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/friends/00000000-0000-0000-0000-000000000002/compare',
    });

    expect(res.statusCode).toBe(403);
  });

  it('deve retornar 404 se a relação estiver marcada como bloqueada', async () => {
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({
      id: 11,
      requesterId: '00000000-0000-0000-0000-000000000001',
      addresseeId: '00000000-0000-0000-0000-000000000002',
      status: 'blocked',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await fastify.inject({
      method: 'GET',
      url: '/friends/00000000-0000-0000-0000-000000000002/compare',
    });

    expect(res.statusCode).toBe(404);
  });

  it('deve retornar 200 com os dados de comparação quando amigos confirmados', async () => {
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({
      id: 12,
      requesterId: '00000000-0000-0000-0000-000000000001',
      addresseeId: '00000000-0000-0000-0000-000000000002',
      status: 'accepted',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockResult = {
      friend: {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'viajante_parceiro',
        avatarUrl: null,
        friendCode: 'AK-9999-8888',
      },
      affinity: {
        percentage: 88,
        label: 'Frequência Harmônica' as const,
        totalShared: 10,
        totalOverlapRated: 5,
      },
      watchTogether: [],
      ratedOverlap: [],
      friendRecommendations: [],
    };

    vi.mocked(comparisonService.compareUserLibraries).mockResolvedValue(mockResult);

    const res = await fastify.inject({
      method: 'GET',
      url: '/friends/00000000-0000-0000-0000-000000000002/compare',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.affinity.percentage).toBe(88);
    expect(body.affinity.label).toBe('Frequência Harmônica');
    expect(body.friend.username).toBe('viajante_parceiro');
  });
});
