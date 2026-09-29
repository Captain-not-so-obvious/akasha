import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateGameWeight,
  getUserGameRecommendations,
} from '../../src/services/game-recommendation.service.js';
import { prisma } from '../../src/lib/prisma.js';
import * as igdbService from '../../src/services/igdb.service.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    wishlist: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/igdb.service.js', () => ({
  fetchSimilarGames: vi.fn(),
  fetchPopularGames: vi.fn(),
  fetchGameDetails: vi.fn(),
}));

describe('Game Recommendation Service - Unit Tests', () => {
  const mockUserId = 'user-games-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateGameWeight', () => {
    it('deve atribuir peso fortemente negativo (-3.0) para status dropped', () => {
      const weight = calculateGameWeight({
        externalId: '1024',
        title: 'Jogo Abandonado',
        userRating: 5,
        status: 'dropped',
      });
      expect(weight).toBe(-3.0);
    });

    it('deve calcular corretamente peso positivo com multiplicador de status completed (1.5x)', () => {
      const weight = calculateGameWeight({
        externalId: '1024',
        title: 'The Witcher 3',
        userRating: 5,
        status: 'completed',
      });
      // 3.0 * 1.5 = 4.5
      expect(weight).toBe(4.5);
    });

    it('deve calcular corretamente peso com status watching (1.2x)', () => {
      const weight = calculateGameWeight({
        externalId: '1025',
        title: 'Elden Ring',
        userRating: 4,
        status: 'watching',
      });
      // 2.0 * 1.2 = 2.4
      expect(weight).toBeCloseTo(2.4);
    });

    it('deve calcular peso negativo para avaliações ruins (1 ou 2 estrelas)', () => {
      const weight2 = calculateGameWeight({
        externalId: '1026',
        title: 'Jogo Mediano',
        userRating: 2,
        status: 'completed',
      });
      // -1.0 * 1.5 = -1.5
      expect(weight2).toBe(-1.5);

      const weight1 = calculateGameWeight({
        externalId: '1027',
        title: 'Jogo Ruim',
        userRating: 1,
        status: 'plan_to_watch',
      });
      // -2.0 * 1.0 = -2.0
      expect(weight1).toBe(-2.0);
    });
  });

  describe('getUserGameRecommendations', () => {
    it('deve disparar Cold Start com jogos populares quando a biblioteca de jogos estiver vazia', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([]);
      vi.mocked(igdbService.fetchPopularGames).mockResolvedValue([
        {
          id: '1024',
          title: 'The Witcher 3: Wild Hunt',
          coverUrl: '/cover.jpg',
          backdropUrl: '/back.jpg',
          releaseYear: 2015,
          genres: ['RPG'],
          platforms: ['PC', 'PS5'],
          rating: 93,
        },
      ]);

      const recs = await getUserGameRecommendations(mockUserId, { limit: 5 });

      expect(recs).toHaveLength(1);
      expect(recs[0].title).toBe('The Witcher 3: Wild Hunt');
      expect(recs[0].reason).toContain('Em alta na Twitch');
      expect(igdbService.fetchPopularGames).toHaveBeenCalled();
    });

    it('deve recomendar jogos similares baseados nas sementes de maior peso do usuário', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          domain: 'game',
          externalId: '1024',
          title: 'The Witcher 3',
          userRating: 5,
          status: 'completed',
          notes: 'Sensacional',
          createdAt: new Date(),
          updatedAt: new Date(),
          tmdbId: null,
          mediaType: null,
          coverUrl: null,
          releaseYear: null,
          extraMeta: null,
        } as any,
      ]);

      vi.mocked(igdbService.fetchSimilarGames).mockResolvedValue([
        {
          id: '1025',
          title: 'Elden Ring',
          coverUrl: '/elden.jpg',
          backdropUrl: null,
          releaseYear: 2022,
          genres: ['Action RPG'],
          platforms: ['PC'],
          rating: 95,
        },
      ]);

      vi.mocked(igdbService.fetchPopularGames).mockResolvedValue([]);

      const recs = await getUserGameRecommendations(mockUserId, { limit: 5 });

      expect(recs).toHaveLength(1);
      expect(recs[0].id).toBe('1025');
      expect(recs[0].title).toBe('Elden Ring');
      expect(recs[0].reason).toContain('The Witcher 3');
      expect(igdbService.fetchSimilarGames).toHaveBeenCalledWith('1024', 6);
    });

    it('deve filtrar jogos que o usuário já possui na sua biblioteca', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          domain: 'game',
          externalId: '1024',
          title: 'The Witcher 3',
          userRating: 5,
          status: 'completed',
          updatedAt: new Date(),
        } as any,
        {
          id: 2,
          userId: mockUserId,
          domain: 'game',
          externalId: '1025',
          title: 'Elden Ring',
          userRating: null,
          status: 'plan_to_watch',
          updatedAt: new Date(),
        } as any,
      ]);

      // Similar games retorna Elden Ring (que o usuário já tem) e Baldur's Gate 3 (novo)
      vi.mocked(igdbService.fetchSimilarGames).mockResolvedValue([
        {
          id: '1025', // já na biblioteca
          title: 'Elden Ring',
          coverUrl: null,
          backdropUrl: null,
          releaseYear: 2022,
          genres: ['RPG'],
          platforms: ['PC'],
          rating: 95,
        },
        {
          id: '1026', // não está na biblioteca
          title: "Baldur's Gate 3",
          coverUrl: null,
          backdropUrl: null,
          releaseYear: 2023,
          genres: ['RPG'],
          platforms: ['PC'],
          rating: 96,
        },
      ]);

      vi.mocked(igdbService.fetchPopularGames).mockResolvedValue([]);

      const recs = await getUserGameRecommendations(mockUserId, { limit: 5 });

      expect(recs.map((r) => r.id)).not.toContain('1025');
      expect(recs.map((r) => r.id)).toContain('1026');
    });
  });
});
