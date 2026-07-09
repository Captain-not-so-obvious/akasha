import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { wishlistRoutes } from './wishlist.routes.js';
import { prisma } from '../lib/prisma.js';

// Mock do prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    wishlist: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock do middleware de auth para injetar o userId em todas as requisições
vi.mock('../middlewares/auth.middleware.js', () => ({
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

  it('POST /wishlist - deve adicionar um item válido', async () => {
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

  it('PATCH /wishlist/:id - deve atualizar um item', async () => {
    const mockItem = { id: 1, status: 'completed', userRating: 5 };
    vi.mocked(prisma.wishlist.update).mockResolvedValue(mockItem as any);

    const response = await fastify.inject({
      method: 'PATCH',
      url: '/wishlist/1',
      payload: {
        status: 'completed',
        userRating: 5,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockItem);
    expect(prisma.wishlist.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, userId: 'user-123' },
        data: { status: 'completed', userRating: 5 },
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
