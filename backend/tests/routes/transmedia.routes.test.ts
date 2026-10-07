import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { transmediaRoutes } from '../../src/routes/transmedia.routes.js';
import * as transmediaService from '../../src/services/transmedia.service.js';

vi.mock('../../src/services/transmedia.service.js', () => ({
  getUserTransmediaRecommendations: vi.fn(),
  getUserArchiveStats: vi.fn(),
  CANONICAL_FRANCHISES: [
    {
      id: 'witcher',
      name: 'The Witcher',
      medias: [
        { domain: 'game', externalId: '1942', title: 'The Witcher 3' },
        { domain: 'book', externalId: 'yv_2DwAAQBAJ', title: 'O Último Desejo' },
      ],
    },
  ],
}));

// Mock do authMiddleware
vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request) => {
    request.userId = 'user-transmedia-test-uuid';
  }),
}));

describe('Integration: Transmedia Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(transmediaRoutes, { prefix: '/transmedia' });
    vi.clearAllMocks();
  });

  describe('GET /transmedia/recommendations', () => {
    it('deve retornar recomendações transmídia do usuário com sucesso', async () => {
      const mockRecs = [
        {
          franchiseName: 'The Witcher',
          sourceItem: { domain: 'game', externalId: '1942', title: 'The Witcher 3' },
          targetItem: { domain: 'book', externalId: 'yv_2DwAAQBAJ', title: 'O Último Desejo' },
          reason: 'Porque você jogou The Witcher 3',
          score: 95,
          isColdStart: false,
        },
      ];
      vi.mocked(transmediaService.getUserTransmediaRecommendations).mockResolvedValue(mockRecs as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/transmedia/recommendations?limit=5',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ recommendations: mockRecs });
      expect(transmediaService.getUserTransmediaRecommendations).toHaveBeenCalledWith(
        'user-transmedia-test-uuid',
        5
      );
    });
  });

  describe('GET /transmedia/stats', () => {
    it('deve retornar métricas analíticas consolidadas do Grande Acervo', async () => {
      const mockStats = {
        totalItems: 12,
        domainBreakdown: {
          movie: { count: 3, percentage: 25, averageRating: 4.5 },
          tv: { count: 2, percentage: 17, averageRating: 5.0 },
          game: { count: 3, percentage: 25, averageRating: 4.0 },
          book: { count: 2, percentage: 17, averageRating: 4.5 },
          comic: { count: 2, percentage: 17, averageRating: 5.0 },
        },
        statusBreakdown: {
          plan_to_watch: { count: 4, percentage: 33 },
          watching: { count: 3, percentage: 25 },
          completed: { count: 5, percentage: 42 },
          dropped: { count: 0, percentage: 0 },
        },
        ratingStats: { average: 4.6, ratedCount: 10, distribution: { '5': 6, '4': 4 } },
        consumptionMetrics: {
          estimatedScreenHours: 26,
          estimatedGameHours: 120,
          estimatedPagesRead: 1200,
          totalComicVolumes: 2,
        },
        franchiseStats: { totalFranchises: 3, topFranchises: [] },
        diversityIndex: {
          score: 92,
          archetypeTitle: 'Polímata Transmídia',
          archetypeDescription: 'Você transcende os limites de uma única mídia.',
        },
      };

      vi.mocked(transmediaService.getUserArchiveStats).mockResolvedValue(mockStats as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/transmedia/stats',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(mockStats);
      expect(transmediaService.getUserArchiveStats).toHaveBeenCalledWith('user-transmedia-test-uuid');
    });
  });

  describe('GET /transmedia/franchises', () => {
    it('deve retornar lista de franquias canônicas registradas', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/transmedia/franchises',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('franchises');
      expect(data.franchises.length).toBeGreaterThan(0);
      expect(data.franchises[0].name).toBe('The Witcher');
      expect(data.franchises[0].mediaCount).toBe(2);
    });
  });
});
