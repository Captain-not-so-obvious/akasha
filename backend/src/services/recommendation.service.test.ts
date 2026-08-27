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

    it('deve aplicar peso negativo forte para status dropped mesmo com notas baixas', () => {
      const weight1 = calculateItemWeight({
        tmdbId: 102,
        mediaType: 'tv',
        userRating: 3,
        status: 'dropped',
      });
      expect(weight1).toBe(-3.0);

      // Garante que 1 estrela + dropped não resulta em multiplicação positiva (-2 * -1.5)
      const weight2 = calculateItemWeight({
        tmdbId: 103,
        mediaType: 'movie',
        userRating: 1,
        status: 'dropped',
      });
      expect(weight2).toBe(-3.0);
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
      expect(recs[0].releaseDate).toBe('1999-10-15');
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
      expect(recs[0].releaseDate).toBe('2010-07-16');
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

    it('deve priorizar mídias avaliadas mais recentemente em caso de empate de peso', async () => {
      const oldDate = new Date('2026-01-01T00:00:00Z');
      const newDate = new Date('2026-08-26T12:00:00Z');

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          tmdbId: 10, // Filme Antigo (5★ completed)
          mediaType: 'movie',
          status: 'completed',
          userRating: 5,
          notes: null,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
        {
          id: 2,
          userId: mockUserId,
          tmdbId: 20, // Filme Novo (5★ completed)
          mediaType: 'movie',
          status: 'completed',
          userRating: 5,
          notes: null,
          createdAt: newDate,
          updatedAt: newDate,
        },
      ]);

      // Mock para verificar qual semente é consultada primeiro no TMDB
      vi.mocked(tmdbService.fetchMediaRecommendations).mockImplementation(async (tmdbId) => {
        if (tmdbId === 20) {
          return [
            {
              id: 999,
              title: 'Recomendado pelo Filme Novo',
              overview: '...',
              posterUrl: null,
              backdropUrl: null,
              releaseDate: null,
              mediaType: 'movie',
              voteAverage: 9.0,
            },
          ];
        }
        return [];
      });

      const recs = await getUserRecommendations(mockUserId, { limit: 1 });

      expect(recs.length).toBe(1);
      expect(recs[0].tmdbId).toBe(999);
      expect(tmdbService.fetchMediaRecommendations).toHaveBeenCalledWith(20, 'movie');
    });

    it('deve priorizar sementes do tipo série quando mediaType=tv for solicitado', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          tmdbId: 100, // Filme muito bem avaliado
          mediaType: 'movie',
          status: 'completed',
          userRating: 5,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId: mockUserId,
          tmdbId: 500, // Série bem avaliada
          mediaType: 'tv',
          status: 'completed',
          userRating: 5,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(tmdbService.fetchMediaRecommendations).mockImplementation(async (tmdbId, mediaType) => {
        if (tmdbId === 500 && mediaType === 'tv') {
          return [
            {
              id: 700,
              title: 'Série Recomendada Baseada na Série 500',
              overview: '...',
              posterUrl: null,
              backdropUrl: null,
              releaseDate: null,
              mediaType: 'tv',
              voteAverage: 8.5,
            },
          ];
        }
        return [];
      });

      const recs = await getUserRecommendations(mockUserId, { limit: 10, mediaType: 'tv' });

      expect(recs.length).toBe(1);
      expect(recs[0].tmdbId).toBe(700);
      expect(recs[0].mediaType).toBe('tv');
      expect(recs[0].reason).not.toContain('Em alta');
      expect(tmdbService.fetchMediaRecommendations).toHaveBeenCalledWith(500, 'tv');
    });

    it('deve intercalar filmes e séries quando mediaType=all for solicitado', async () => {
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
        {
          id: 2,
          userId: mockUserId,
          tmdbId: 500,
          mediaType: 'tv',
          status: 'completed',
          userRating: 5,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(tmdbService.fetchMediaRecommendations).mockImplementation(async (tmdbId, mediaType) => {
        if (mediaType === 'movie') {
          return [
            {
              id: 101,
              title: 'Filme Recomendado 1',
              overview: '...',
              posterUrl: null,
              backdropUrl: null,
              releaseDate: null,
              mediaType: 'movie',
              voteAverage: 9.0,
            },
          ];
        }
        if (mediaType === 'tv') {
          return [
            {
              id: 501,
              title: 'Série Recomendada 1',
              overview: '...',
              posterUrl: null,
              backdropUrl: null,
              releaseDate: null,
              mediaType: 'tv',
              voteAverage: 8.8,
            },
          ];
        }
        return [];
      });

      const recs = await getUserRecommendations(mockUserId, { limit: 10, mediaType: 'all' });

      expect(recs.length).toBe(2);
      const mediaTypes = recs.map((r) => r.mediaType);
      expect(mediaTypes).toContain('movie');
      expect(mediaTypes).toContain('tv');
    });
  });
});
