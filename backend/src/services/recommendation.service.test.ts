import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateItemWeight, getUserRecommendations } from './recommendation.service.js';
import { prisma } from '../lib/prisma.js';
import * as tmdbService from './tmdb.service.js';

// Mock das dependências externas (Prisma e TMDB)
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    wishlist: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('./tmdb.service.js', () => ({
  fetchMediaRecommendations: vi.fn(),
  fetchTrendingMedia: vi.fn(),
}));

describe('Recommendation Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tmdbService.fetchTrendingMedia).mockResolvedValue([]);
    vi.mocked(tmdbService.fetchMediaRecommendations).mockResolvedValue([]);
  });

  describe('calculateItemWeight', () => {
    it('deve atribuir peso positivo alto para notas 5★ em status completed', () => {
      const weight = calculateItemWeight({
        tmdbId: 100,
        mediaType: 'movie',
        userRating: 5,
        status: 'completed',
      });
      // 3.0 * 1.5 = 4.5
      expect(weight).toBe(4.5);
    });

    it('deve penalizar notas baixas (1 ou 2 estrelas)', () => {
      const weight = calculateItemWeight({
        tmdbId: 101,
        mediaType: 'movie',
        userRating: 1,
        status: 'completed',
      });
      // -2.0 * 1.5 = -3.0
      expect(weight).toBe(-3.0);
    });

    it('deve aplicar peso negativo forte para status dropped', () => {
      const weight = calculateItemWeight({
        tmdbId: 102,
        mediaType: 'tv',
        userRating: 3,
        status: 'dropped',
      });
      // 1.0 * -1.5 = -1.5
      expect(weight).toBe(-1.5);
    });
  });

  describe('getUserRecommendations', () => {
    const mockUserId = 'user-uuid-123';

    it('deve acionar Cold Start se o usuário tiver wishlist vazia', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([]);
      vi.mocked(tmdbService.fetchTrendingMedia).mockResolvedValue([
        {
          id: 550,
          title: 'Clube da Luta',
          overview: 'Um homem insone...',
          posterUrl: '/poster.jpg',
          backdropUrl: '/backdrop.jpg',
          releaseDate: '1999-10-15',
          mediaType: 'movie',
          voteAverage: 8.4,
        },
      ]);

      const recs = await getUserRecommendations(mockUserId, { limit: 5 });

      expect(recs.length).toBe(1);
      expect(recs[0].isColdStart).toBe(true);
      expect(recs[0].reason).toContain('tendências');
      expect(recs[0].tmdbId).toBe(550);
    });

    it('deve gerar recomendações com explicação baseada em avaliação 5 estrelas', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          tmdbId: 157336, // Interstellar
          mediaType: 'movie',
          status: 'completed',
          userRating: 5,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(tmdbService.fetchMediaRecommendations).mockResolvedValue([
        {
          id: 27205, // Inception
          title: 'A Origem',
          overview: 'Dom Cobb é um ladrão...',
          posterUrl: '/inception.jpg',
          backdropUrl: '/inception_bg.jpg',
          releaseDate: '2010-07-16',
          mediaType: 'movie',
          voteAverage: 8.8,
        },
      ]);

      const recs = await getUserRecommendations(mockUserId, { limit: 10 });

      expect(recs.length).toBe(1);
      expect(recs[0].tmdbId).toBe(27205);
      expect(recs[0].isColdStart).toBe(false);
      expect(recs[0].reason).toContain('5★');
    });

    it('NUNCA deve recomendar itens que o usuário já possui na sua wishlist', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          tmdbId: 100,
          mediaType: 'movie',
          status: 'completed',
          userRating: 5,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // TMDB retorna o próprio item 100 e um novo item 200
      vi.mocked(tmdbService.fetchMediaRecommendations).mockResolvedValue([
        {
          id: 100,
          title: 'Filme Existente na Wishlist',
          overview: '...',
          posterUrl: null,
          backdropUrl: null,
          releaseDate: null,
          mediaType: 'movie',
          voteAverage: 7.0,
        },
        {
          id: 200,
          title: 'Filme Novo Recomendado',
          overview: '...',
          posterUrl: null,
          backdropUrl: null,
          releaseDate: null,
          mediaType: 'movie',
          voteAverage: 8.0,
        },
      ]);

      const recs = await getUserRecommendations(mockUserId);

      expect(recs.length).toBe(1);
      expect(recs[0].tmdbId).toBe(200);
      expect(recs.find((r) => r.tmdbId === 100)).toBeUndefined();
    });
  });
});
