import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { friendsRoutes } from '../../src/routes/friends.routes.js';
import { prisma } from '../../src/lib/prisma.js';

// Mock do prisma
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
  },
}));

// Mock do middleware de autenticação
vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  verifySupabaseAuth: vi.fn(async (request) => {
    request.userId = '00000000-0000-0000-0000-000000000001';
  }),
}));

describe('Integração: Rotas de Amizade (SPEC-002)', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(friendsRoutes, { prefix: '/friends' });
    vi.clearAllMocks();
  });

  it('POST /friends/request - deve enviar solicitação com sucesso para target válido', async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000002',
      email: 'amigo@akasha.com',
      username: 'amigo_cinefilo',
      friendCode: 'AK-41A8-99B2',
      avatarUrl: null,
      updatedAt: new Date(),
    });
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.friendship.create).mockResolvedValue({
      id: 1,
      requesterId: '00000000-0000-0000-0000-000000000001',
      addresseeId: '00000000-0000-0000-0000-000000000002',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/friends/request',
      payload: { target: 'amigo@akasha.com' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty('success', true);
    expect(prisma.friendship.create).toHaveBeenCalled();
  });

  it('POST /friends/request - deve rejeitar solicitação para si mesmo', async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'eu@akasha.com',
      username: 'eu_mesmo',
      friendCode: 'AK-0000-0000',
      avatarUrl: null,
      updatedAt: new Date(),
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/friends/request',
      payload: { target: 'eu@akasha.com' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain('si mesmo');
  });

  it('POST /friends/request - deve retornar 404 se usuário não for encontrado', async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue(null);

    const response = await fastify.inject({
      method: 'POST',
      url: '/friends/request',
      payload: { target: 'inexistente@akasha.com' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('GET /friends - deve retornar lista formatada de amigos aceitos', async () => {
    const mockFriendships = [
      {
        id: 10,
        requesterId: '00000000-0000-0000-0000-000000000001',
        addresseeId: '00000000-0000-0000-0000-000000000002',
        status: 'accepted' as const,
        createdAt: new Date(),
        updatedAt: new Date('2026-09-23T10:00:00Z'),
        requester: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'eu',
          avatarUrl: null,
          friendCode: 'AK-1111-1111',
          _count: { wishlists: 5 },
        },
        addressee: {
          id: '00000000-0000-0000-0000-000000000002',
          username: 'amigo_cinefilo',
          avatarUrl: 'https://avatar.png',
          friendCode: 'AK-2222-2222',
          _count: { wishlists: 42 },
        },
      },
    ];

    vi.mocked(prisma.friendship.findMany).mockResolvedValue(mockFriendships);

    const response = await fastify.inject({
      method: 'GET',
      url: '/friends',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: '00000000-0000-0000-0000-000000000002',
      username: 'amigo_cinefilo',
      friendCode: 'AK-2222-2222',
      totalMedia: 42,
    });
  });

  it('PATCH /friends/requests/:id - deve aceitar solicitação pendente', async () => {
    vi.mocked(prisma.friendship.findUnique).mockResolvedValue({
      id: 5,
      requesterId: '00000000-0000-0000-0000-000000000002',
      addresseeId: '00000000-0000-0000-0000-000000000001',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.friendship.update).mockResolvedValue({
      id: 5,
      requesterId: '00000000-0000-0000-0000-000000000002',
      addresseeId: '00000000-0000-0000-0000-000000000001',
      status: 'accepted',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await fastify.inject({
      method: 'PATCH',
      url: '/friends/requests/5',
      payload: { action: 'accept' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('success', true);
    expect(prisma.friendship.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { status: 'accepted' },
    });
  });

  it('POST /friends/regenerate-code - deve gerar e retornar um novo Friend Code', async () => {
    vi.mocked(prisma.profile.update).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'eu@akasha.com',
      username: 'eu',
      avatarUrl: null,
      friendCode: 'AK-NEW1-CODE',
      updatedAt: new Date(),
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/friends/regenerate-code',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('friendCode');
  });

  it('POST /friends/:id/block - deve bloquear usuário com sucesso', async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000002',
      email: 'alvo@akasha.com',
      username: 'alvo',
      avatarUrl: null,
      friendCode: 'AK-2222-2222',
      updatedAt: new Date(),
    });
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.friendship.create).mockResolvedValue({
      id: 99,
      requesterId: '00000000-0000-0000-0000-000000000001',
      addresseeId: '00000000-0000-0000-0000-000000000002',
      status: 'blocked',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await fastify.inject({
      method: 'POST',
      url: '/friends/00000000-0000-0000-0000-000000000002/block',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('success', true);
    expect(prisma.friendship.create).toHaveBeenCalledWith({
      data: {
        requesterId: '00000000-0000-0000-0000-000000000001',
        addresseeId: '00000000-0000-0000-0000-000000000002',
        status: 'blocked',
      },
    });
  });

  it('GET /friends/blocked - deve listar usuários bloqueados', async () => {
    vi.mocked(prisma.friendship.findMany).mockResolvedValue([
      {
        id: 99,
        requesterId: '00000000-0000-0000-0000-000000000001',
        addresseeId: '00000000-0000-0000-0000-000000000002',
        status: 'blocked',
        createdAt: new Date(),
        updatedAt: new Date(),
        addressee: {
          id: '00000000-0000-0000-0000-000000000002',
          username: 'bloqueado',
          avatarUrl: null,
          friendCode: 'AK-0000-1111',
        },
      } as any,
    ]);

    const response = await fastify.inject({
      method: 'GET',
      url: '/friends/blocked',
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toHaveLength(1);
    expect(data[0].username).toBe('bloqueado');
  });

  it('POST /friends/:id/unblock - deve desbloquear usuário com sucesso', async () => {
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({
      id: 99,
      requesterId: '00000000-0000-0000-0000-000000000001',
      addresseeId: '00000000-0000-0000-0000-000000000002',
      status: 'blocked',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.friendship.delete).mockResolvedValue({} as any);

    const response = await fastify.inject({
      method: 'POST',
      url: '/friends/00000000-0000-0000-0000-000000000002/unblock',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('success', true);
    expect(prisma.friendship.delete).toHaveBeenCalledWith({ where: { id: 99 } });
  });
});
