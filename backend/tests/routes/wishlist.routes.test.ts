import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { wishlistRoutes } from '../../src/routes/wishlist.routes.js';
import { prisma } from '../../src/lib/prisma.js';

// Mock do prisma
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    wishlist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}));

// Mock do middleware de auth para injetar o userId em todas as requisições
vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request) => {
    request.userId = 'user-123';
  }),
}));

describe('Integration: Wishlist Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(wishlistRoutes, { prefix: '/wishlist' });
    vi.clearAllMocks();
  });

  it('GET /wishlist - deve retornar a lista de itens', async () => {
    const mockItems = [{ id: 1, tmdbId: 123, mediaType: 'movie' }];
    vi.mocked(prisma.wishlist.findMany).mockResolvedValue(mockItems as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/wishlist',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockItems);
    expect(prisma.wishlist.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('GET /wishlist?domain=game - deve filtrar itens pelo domínio especificado', async () => {
    const mockGames = [
      { id: 2, domain: 'game', externalId: '1024', title: 'The Witcher 3', status: 'watching' },
    ];
    vi.mocked(prisma.wishlist.findMany).mockResolvedValue(mockGames as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/wishlist?domain=game',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockGames);
    expect(prisma.wishlist.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', domain: 'game' },
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('POST /wishlist - deve adicionar um item válido de cinema', async () => {
    const mockItem = { id: 1, tmdbId: 123, mediaType: 'movie', status: 'watching' };
    vi.mocked(prisma.wishlist.upsert).mockResolvedValue(mockItem as any);

    const response = await fastify.inject({
      method: 'POST',
      url: '/wishlist',
      payload: {
        tmdbId: 123,
        mediaType: 'movie',
        status: 'watching',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(mockItem);
  });

  it('POST /wishlist - deve adicionar um jogo (game) com metadados polimórficos', async () => {
    const mockGameItem = {
      id: 5,
      domain: 'game',
      externalId: '1024',
      status: 'watching',
      userRating: 5,
      notes: 'Um dos melhores RPGs da história',
      title: 'The Witcher 3: Wild Hunt',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
    };
    vi.mocked(prisma.wishlist.upsert).mockResolvedValue(mockGameItem as any);

    const response = await fastify.inject({
      method: 'POST',
      url: '/wishlist',
      payload: {
        domain: 'game',
        externalId: '1024',
        status: 'in_progress', // normaliza para watching
        userRating: 5,
        notes: 'Um dos melhores RPGs da história',
        title: 'The Witcher 3: Wild Hunt',
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(mockGameItem);
    expect(prisma.wishlist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_domain_externalId: {
            userId: 'user-123',
            domain: 'game',
            externalId: '1024',
          },
        },
      })
    );
  });

  it('POST /wishlist - deve rejeitar dados inválidos', async () => {
    const response = await fastify.inject({
      method: 'POST',
      url: '/wishlist',
      payload: {
        tmdbId: 'invalid-id',
        mediaType: 'movie',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty('error', 'Dados inválidos.');
  });

  it('PATCH /wishlist/:id - deve atualizar um item com nota e opinião', async () => {
    const existingItem = { id: 1, userId: 'user-123', tmdbId: 123, mediaType: 'movie', status: 'watching', userRating: 3, notes: null };
    const mockItem = { id: 1, userId: 'user-123', tmdbId: 123, mediaType: 'movie', status: 'completed', userRating: 5, notes: 'Filme excepcional!' };
    vi.mocked(prisma.wishlist.findUnique).mockResolvedValue(existingItem as any);
    vi.mocked(prisma.wishlist.update).mockResolvedValue(mockItem as any);

    const response = await fastify.inject({
      method: 'PATCH',
      url: '/wishlist/1',
      payload: {
        status: 'completed',
        userRating: 5,
        notes: 'Filme excepcional!',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockItem);
    expect(prisma.wishlist.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, userId: 'user-123' },
        data: { status: 'completed', userRating: 5, notes: 'Filme excepcional!' },
      })
    );
  });

  it('DELETE /wishlist/:id - deve deletar um item', async () => {
    vi.mocked(prisma.wishlist.delete).mockResolvedValue({} as any);

    const response = await fastify.inject({
      method: 'DELETE',
      url: '/wishlist/1',
    });

    expect(response.statusCode).toBe(204);
    expect(prisma.wishlist.delete).toHaveBeenCalledWith({
      where: { id: 1, userId: 'user-123' },
    });
  });
});
