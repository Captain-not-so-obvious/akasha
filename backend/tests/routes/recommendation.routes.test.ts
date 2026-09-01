import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { recommendationRoutes } from '../../src/routes/recommendation.routes.js';
import * as recommendationService from '../../src/services/recommendation.service.js';

vi.mock('../../src/services/recommendation.service.js', () => ({
  getUserRecommendations: vi.fn(),
}));

vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request) => {
    request.userId = 'user-123';
  }),
}));

describe('Integration: Recommendation Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(recommendationRoutes, { prefix: '/recommendations' });
    vi.clearAllMocks();
  });

  it('GET /recommendations - deve retornar recomendações com sucesso', async () => {
    const mockRecs = [
      {
        tmdbId: 100,
        title: 'Filme Recomendado',
        overview: 'Descrição...',
        posterUrl: '/poster.jpg',
        backdropUrl: '/backdrop.jpg',
        releaseDate: '2024-01-01',
        mediaType: 'movie' as const,
        voteAverage: 8.5,
        reason: 'Porque você avaliou com 5★',
        score: 95,
        isColdStart: false,
      },
    ];

    vi.mocked(recommendationService.getUserRecommendations).mockResolvedValue(mockRecs);

    const response = await fastify.inject({
      method: 'GET',
      url: '/recommendations?limit=10&mediaType=movie',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockRecs);
    expect(recommendationService.getUserRecommendations).toHaveBeenCalledWith('user-123', {
      limit: 10,
      mediaType: 'movie',
    });
  });

  it('GET /recommendations - deve tratar parâmetros inválidos com 400', async () => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/recommendations?mediaType=invalid_type',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty('error', 'Parâmetros de busca inválidos.');
  });
});
