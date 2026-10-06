import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { comicsRoutes } from '../../src/routes/comics.routes.js';
import * as comicsService from '../../src/services/comics.service.js';
import * as comicRecService from '../../src/services/comic-recommendation.service.js';

vi.mock('../../src/services/comics.service.js', () => ({
  searchComics: vi.fn(),
  getComicDetails: vi.fn(),
  fetchPopularComics: vi.fn(),
}));

vi.mock('../../src/services/comic-recommendation.service.js', () => ({
  getUserComicRecommendations: vi.fn(),
}));

vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request) => {
    (request as any).userId = 'user-comics-123';
  }),
}));

describe('Integration: Comics Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(comicsRoutes, { prefix: '/comics' });
    vi.clearAllMocks();
  });

  describe('GET /comics/search', () => {
    it('deve retornar resultados da busca com sucesso', async () => {
      const mockResults = [
        { id: 'cv-4050-3622', title: 'Watchmen', type: 'comic', releaseYear: 1986 },
      ];
      vi.mocked(comicsService.searchComics).mockResolvedValue(mockResults as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/comics/search?q=watchmen&type=comic',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ results: mockResults });
      expect(comicsService.searchComics).toHaveBeenCalledWith('watchmen', 'comic', 12);
    });

    it('deve retornar 400 se o parâmetro "q" for omitido', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/comics/search',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Parâmetros de busca inválidos.');
    });
  });

  describe('GET /comics/popular', () => {
    it('deve retornar sagas populares', async () => {
      const mockPopular = [
        { id: 'al-30002', title: 'Berserk', type: 'manga' },
      ];
      vi.mocked(comicsService.fetchPopularComics).mockResolvedValue(mockPopular as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/comics/popular?limit=5',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ results: mockPopular });
    });
  });

  describe('GET /comics/recommendations', () => {
    it('deve retornar recomendações personalizadas do usuário', async () => {
      const mockRecs = [
        { id: 'cv-4050-8635', title: 'Batman: O Longo Dia das Bruxas', score: 92 },
      ];
      vi.mocked(comicRecService.getUserComicRecommendations).mockResolvedValue(mockRecs as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/comics/recommendations?limit=6',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ recommendations: mockRecs });
      expect(comicRecService.getUserComicRecommendations).toHaveBeenCalledWith('user-comics-123', { limit: 6, type: 'all' });
    });

    it('deve repassar filtro de tipo (comic ou manga) para o serviço de recomendação', async () => {
      const mockRecs = [
        { id: 'al-30002', title: 'Berserk', type: 'manga', score: 95 },
      ];
      vi.mocked(comicRecService.getUserComicRecommendations).mockResolvedValue(mockRecs as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/comics/recommendations?limit=8&type=manga',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ recommendations: mockRecs });
      expect(comicRecService.getUserComicRecommendations).toHaveBeenCalledWith('user-comics-123', { limit: 8, type: 'manga' });
    });
  });

  describe('GET /comics/:id', () => {
    it('deve retornar detalhes e edições enumeradas de uma saga', async () => {
      const mockDetail = {
        id: 'cv-4050-3622',
        title: 'Watchmen',
        type: 'comic',
        issues: [
          { id: '1', name: 'Watchmen #1', issueNumber: '1' },
          { id: '2', name: 'Watchmen #2', issueNumber: '2' },
        ],
      };
      vi.mocked(comicsService.getComicDetails).mockResolvedValue(mockDetail as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/comics/cv-4050-3622',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(mockDetail);
    });

    it('deve retornar 404 se a saga ou mangá não existir', async () => {
      vi.mocked(comicsService.getComicDetails).mockResolvedValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/comics/cv-invalid',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toHaveProperty('error', 'Quadrinho ou mangá não encontrado.');
    });
  });
});
