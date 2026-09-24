import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { feedRoutes } from '../../src/routes/feed.routes.js';
import * as activityService from '../../src/services/activity.service.js';

vi.mock('../../src/services/activity.service.js', () => ({
  getFeedForUser: vi.fn(),
}));

vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request) => {
    request.userId = 'user-123';
  }),
}));

describe('Integration: Feed Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(feedRoutes, { prefix: '/feed' });
    vi.clearAllMocks();
  });

  it('GET /feed - deve retornar lista paginada de atividades do usuário e seus amigos', async () => {
    const mockFeedData = {
      activities: [
        {
          id: 1,
          userId: 'user-456',
          type: 'RATED_MEDIA',
          tmdbId: 100,
          mediaType: 'movie',
          title: 'Matrix',
          posterPath: '/matrix.jpg',
          userRating: 5,
          status: 'completed',
          createdAt: new Date().toISOString(),
          profile: {
            id: 'user-456',
            username: 'neo',
            avatarUrl: null,
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    vi.mocked(activityService.getFeedForUser).mockResolvedValue(mockFeedData as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/feed?page=1&limit=20',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockFeedData);
    expect(activityService.getFeedForUser).toHaveBeenCalledWith('user-123', 1, 20);
  });
});
