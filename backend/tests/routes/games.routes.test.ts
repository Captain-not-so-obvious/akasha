import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { gamesRoutes } from '../../src/routes/games.routes.js';
import * as igdbService from '../../src/services/igdb.service.js';
import * as gameRecService from '../../src/services/game-recommendation.service.js';

vi.mock('../../src/services/igdb.service.js', () => ({
  searchGames: vi.fn(),
  fetchGameDetails: vi.fn(),
  fetchPopularGames: vi.fn(),
}));

vi.mock('../../src/services/game-recommendation.service.js', () => ({
  getUserGameRecommendations: vi.fn(),
}));

// Mock do middleware de autenticação
vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request) => {
    request.userId = 'user-games-123';
  }),
}));

describe('Integration: Games Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(gamesRoutes, { prefix: '/games' });
    vi.clearAllMocks();
  });

  describe('GET /games/search', () => {
    it('deve retornar resultados da busca com sucesso', async () => {
      const mockResults = [
        { id: '1024', title: 'The Witcher 3: Wild Hunt', releaseYear: 2015 },
      ];
      vi.mocked(igdbService.searchGames).mockResolvedValue(mockResults as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/games/search?q=witcher',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ results: mockResults });
      expect(igdbService.searchGames).toHaveBeenCalledWith('witcher', 10);
    });

    it('deve retornar 400 se query "q" for omitida', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/games/search',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Parâmetros de busca inválidos.');
    });
  });

  describe('GET /games/popular', () => {
    it('deve retornar a lista de jogos populares', async () => {
      const mockPopular = [
        { id: '1025', title: 'Elden Ring', rating: 95 },
      ];
      vi.mocked(igdbService.fetchPopularGames).mockResolvedValue(mockPopular as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/games/popular?limit=5',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ results: mockPopular });
      expect(igdbService.fetchPopularGames).toHaveBeenCalledWith(5);
    });
  });

  describe('GET /games/recommendations', () => {
    it('deve retornar recomendações personalizadas para o usuário autenticado', async () => {
      const mockRecs = [
        { id: '1026', title: "Baldur's Gate 3", score: 90, reason: 'Porque você jogou The Witcher 3' },
      ];
      vi.mocked(gameRecService.getUserGameRecommendations).mockResolvedValue(mockRecs as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/games/recommendations?limit=5',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ recommendations: mockRecs });
      expect(gameRecService.getUserGameRecommendations).toHaveBeenCalledWith('user-games-123', { limit: 5 });
    });
  });

  describe('GET /games/:id', () => {
    it('deve retornar os detalhes de um jogo existente', async () => {
      const mockGame = { id: '1024', title: 'The Witcher 3', releaseYear: 2015 };
      vi.mocked(igdbService.fetchGameDetails).mockResolvedValue(mockGame as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/games/1024',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(mockGame);
      expect(igdbService.fetchGameDetails).toHaveBeenCalledWith('1024');
    });

    it('deve retornar 404 para jogo inexistente', async () => {
      vi.mocked(igdbService.fetchGameDetails).mockResolvedValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/games/999999',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toHaveProperty('error', 'Jogo não encontrado.');
    });
  });
});
